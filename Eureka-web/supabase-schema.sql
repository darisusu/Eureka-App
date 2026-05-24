-- ============================================
-- EurekaGO — Full Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CATEGORIES
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  has_queue BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DEPARTMENT CONFIG (per-category queue settings)
CREATE TABLE dept_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  base_prep_minutes INTEGER DEFAULT 15,
  gap_minutes INTEGER DEFAULT 3,
  max_wait_minutes INTEGER DEFAULT 45,
  UNIQUE(category_id)
);

-- 3. USERS
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'staff')),
  pin_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MENU
CREATE TABLE menu (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(10,2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_number INTEGER NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'paid', 'received', 'preparing', 'ready', 'collected', 'cancelled'
  )),
  ready_at TIMESTAMPTZ,
  promo_id UUID,
  promo_code TEXT,
  discount_cents INTEGER,
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER ITEMS
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menu(id),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  special_request TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDER DEPARTMENT SLOTS (tracks per-department queue slots)
CREATE TABLE order_dept_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  dept_ready_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PROMO CODES
CREATE TABLE promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_upper TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  type TEXT NOT NULL CHECK (type IN ('PERCENT', 'FIXED')),
  value NUMERIC(10,2) NOT NULL,
  max_discount_cents INTEGER,
  min_subtotal_cents INTEGER,
  usage_limit_per_user INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PROMO REDEMPTIONS
CREATE TABLE promo_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_id UUID NOT NULL REFERENCES promo_codes(id),
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  discount_cents INTEGER
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_menu_category ON menu(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_dept_slots_category_ready ON order_dept_slots(category_id, dept_ready_at);
CREATE INDEX idx_promo_redemptions_user_promo ON promo_redemptions(user_id, promo_id);

-- ============================================
-- DAILY ORDER NUMBER (resets at 4am SGT each day)
-- ============================================

-- Tracks the running counter per business day.
-- Business day = Singapore calendar date after subtracting 4 h,
-- so orders placed 00:00–03:59 SGT still count as the previous day.
CREATE TABLE daily_order_counter (
  business_date DATE PRIMARY KEY,
  last_number   INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
DECLARE
  v_business_date DATE;
  v_order_number  INTEGER;
BEGIN
  v_business_date := (NOW() AT TIME ZONE 'Asia/Singapore' - INTERVAL '4 hours')::DATE;

  INSERT INTO daily_order_counter (business_date, last_number)
  VALUES (v_business_date, 1)
  ON CONFLICT (business_date) DO UPDATE
    SET last_number = daily_order_counter.last_number + 1
  RETURNING last_number INTO v_order_number;

  NEW.order_number := v_order_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- ============================================
-- AUTO-UPDATE updated_at ON ORDERS
-- ============================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================
-- MIGRATION: run this if orders table already exists
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- (then create the trigger above)
-- ============================================

-- ============================================
-- ATOMIC ETA CALCULATION FUNCTION
-- Prevents race conditions on concurrent orders
-- ============================================

CREATE OR REPLACE FUNCTION calculate_dept_ready_at(
  p_category_id UUID
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_last_ready TIMESTAMPTZ;
  v_base_prep INTEGER;
  v_gap INTEGER;
  v_max_wait INTEGER;
  v_has_queue BOOLEAN;
  v_result TIMESTAMPTZ;
BEGIN
  SELECT has_queue INTO v_has_queue FROM categories WHERE id = p_category_id;

  SELECT
    COALESCE(dc.base_prep_minutes, 15),
    COALESCE(dc.gap_minutes, 3),
    COALESCE(dc.max_wait_minutes, 45)
  INTO v_base_prep, v_gap, v_max_wait
  FROM dept_config dc
  WHERE dc.category_id = p_category_id;

  IF NOT FOUND THEN
    v_base_prep := 15;
    v_gap := 3;
    v_max_wait := 45;
  END IF;

  IF v_has_queue = FALSE THEN
    RETURN NOW() + (v_base_prep || ' minutes')::INTERVAL;
  END IF;

  SELECT MAX(ods.dept_ready_at) INTO v_last_ready
  FROM order_dept_slots ods
  WHERE ods.category_id = p_category_id
    AND ods.dept_ready_at > NOW() - INTERVAL '2 hours'
  FOR UPDATE;

  v_result := GREATEST(
    NOW() + (v_base_prep || ' minutes')::INTERVAL,
    v_last_ready + (v_gap || ' minutes')::INTERVAL
  );

  IF v_result > NOW() + (v_max_wait || ' minutes')::INTERVAL THEN
    RETURN NULL;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;





-- Add updated_at to orders (powers the staff "Cooking X min" timer)
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

  -- Prevent promo double-redemption under concurrent requests
  ALTER TABLE promo_redemptions
    ADD CONSTRAINT uq_promo_user UNIQUE (promo_id, user_id);

-- ============================================
-- MIGRATION: switch to daily order numbering
-- Run this if orders table already exists with the old sequence approach
-- ============================================

  -- Create the daily counter table
  CREATE TABLE IF NOT EXISTS daily_order_counter (
    business_date DATE PRIMARY KEY,
    last_number   INTEGER NOT NULL DEFAULT 0
  );

  -- Replace the trigger function (same name, new logic)
  CREATE OR REPLACE FUNCTION set_order_number()
  RETURNS TRIGGER AS $$
  DECLARE
    v_business_date DATE;
    v_order_number  INTEGER;
  BEGIN
    v_business_date := (NOW() AT TIME ZONE 'Asia/Singapore' - INTERVAL '4 hours')::DATE;

    INSERT INTO daily_order_counter (business_date, last_number)
    VALUES (v_business_date, 1)
    ON CONFLICT (business_date) DO UPDATE
      SET last_number = daily_order_counter.last_number + 1
    RETURNING last_number INTO v_order_number;

    NEW.order_number := v_order_number;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- The trigger name is unchanged so no need to drop/recreate it.
  -- Optionally clean up the old sequence:
  -- DROP SEQUENCE IF EXISTS order_number_seq;
