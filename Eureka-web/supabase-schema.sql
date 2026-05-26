-- ============================================
-- EurekaGO — Authoritative Schema
-- Reflects current Supabase DB state.
-- To apply from scratch: run the full file.
-- To apply individual migrations: paste only
-- the relevant section at the bottom.
-- ============================================

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  has_queue BOOLEAN DEFAULT TRUE,
  available_from TIME,
  available_until TIME,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dept_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  base_prep_minutes INTEGER DEFAULT 15,
  gap_minutes INTEGER DEFAULT 3,
  max_wait_minutes INTEGER DEFAULT 45,
  UNIQUE(category_id)
);

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'staff')),
  pin_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_number INTEGER NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'paid', 'received', 'ready', 'collected', 'cancelled'
  )),
  ready_at TIMESTAMPTZ,
  promo_id UUID,
  promo_code TEXT,
  discount_cents INTEGER,
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE order_dept_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  dept_ready_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE promo_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_id UUID NOT NULL REFERENCES promo_codes(id),
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  discount_cents INTEGER,
  CONSTRAINT uq_promo_user UNIQUE (promo_id, user_id)
);

-- Daily order number counter (resets at 4am SGT each day)
CREATE TABLE daily_order_counter (
  business_date DATE PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
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
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Order number: increments per business day (4am SGT cutoff)
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
DECLARE
  v_business_date DATE;
  v_order_number INTEGER;
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

-- Auto-update orders.updated_at (powers staff "Cooking X min" timer)
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

-- Atomic ETA calculation — called from /api/create-checkout
-- Returns the timestamp when this category's queue can next accept a new order.
-- Logic:
--   1. If has_queue = false: returns now + base_prep (fixed, no queueing).
--   2. If has_queue = true: finds the latest dept_ready_at slot booked in the
--      last 2 hours (by dept_ready_at, not created_at), then takes the later of:
--        - now + base_prep  (floor: can't be faster than base cook time)
--        - last_slot + gap  (queue position: politely after the previous order)
--      The 2-hour window ignores ancient completed orders so the queue resets
--      naturally when the kitchen is idle. If no slot exists in that window,
--      last_slot is NULL and the result falls back to now + base_prep.
--   3. If result > now + max_wait: returns NULL (kitchen overloaded; caller
--      should surface "unavailable" rather than show a misleading ETA).
CREATE OR REPLACE FUNCTION calculate_dept_ready_at(p_category_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_last_ready TIMESTAMPTZ;
  v_base_prep INTEGER;
  v_gap INTEGER;
  v_max_wait INTEGER;
  v_has_queue BOOLEAN;
  v_result TIMESTAMPTZ;
  v_active_count INTEGER;
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

  -- Count orders still occupying the kitchen (not yet cooked).
  -- Their original slot times may be stale, so we project the queue
  -- forward from now instead of chaining off expired timestamps.
  SELECT COUNT(*) INTO v_active_count
  FROM order_dept_slots ods
  JOIN orders o ON o.id = ods.order_id
  WHERE ods.category_id = p_category_id
    AND o.is_paid = true
    AND o.status = 'received';

  IF v_active_count > 0 THEN
    -- Position the last active order at NOW + base_prep + (count-1)*gap,
    -- then the new order slots after it.
    v_last_ready := NOW() + ((v_base_prep + (v_active_count - 1) * v_gap) || ' minutes')::INTERVAL;
  ELSE
    -- No backlog: chain off the most recent completed slot (within 2 hours).
    SELECT MAX(ods.dept_ready_at) INTO v_last_ready
    FROM order_dept_slots ods
    JOIN orders o ON o.id = ods.order_id
    WHERE ods.category_id = p_category_id
      AND o.is_paid = true
      AND ods.dept_ready_at > NOW() - INTERVAL '2 hours';
  END IF;

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

-- ============================================
-- RLS POLICIES
-- ============================================
-- Service role (used by all API routes) always bypasses RLS.
-- Anon key (client-side reads) gets SELECT only — no writes.

-- Transactional tables (written via service role in API routes)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_dept_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON users FOR SELECT USING (true);
CREATE POLICY "public read" ON orders FOR SELECT USING (true);
CREATE POLICY "public read" ON order_items FOR SELECT USING (true);
CREATE POLICY "public read" ON order_dept_slots FOR SELECT USING (true);
CREATE POLICY "public read" ON promo_redemptions FOR SELECT USING (true);

-- Read-only catalogue tables (never written by clients)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dept_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON categories FOR SELECT USING (true);
CREATE POLICY "public read" ON dept_config FOR SELECT USING (true);
CREATE POLICY "public read" ON menu FOR SELECT USING (true);
CREATE POLICY "public read" ON promo_codes FOR SELECT USING (true);

-- Internal system table — no client access needed
-- Trigger fires from service-role INSERT on orders, which bypasses RLS anyway
ALTER TABLE daily_order_counter ENABLE ROW LEVEL SECURITY;
