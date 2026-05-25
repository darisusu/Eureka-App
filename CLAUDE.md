# Eureka — Claude Code Context

Eureka is a grab-and-go pre-order and prepay platform for high-volume food stalls. Customers browse a menu, add items to a cart, and pay via Stripe before their order enters the kitchen queue. After payment, customers see an estimated wait time; recent orders are accessible from the profile page. Staff use a role-gated dashboard to move orders through a kanban board (Received → Preparing → Ready → Collected). The MVP explicitly excludes delivery, dine-in table management, in-store POS, and inventory management.

---

## Monorepo Structure

```
Eureka-App/
├── Eureka-mobile/   Expo + React Native (iOS & Android) — uses Appwrite backend
└── Eureka-web/      Next.js web app — uses Supabase backend
```

> **Active development focus: `Eureka-web` only.** Do not modify files in `Eureka-mobile/` unless explicitly asked.

---

## Tech Stack

### Eureka-mobile
- **Expo** ~54 · **React Native** 0.81.5
- **Expo Router** ~6 (file-based navigation)
- **NativeWind** v4 — Tailwind classes via `className` prop on RN primitives; do not use `StyleSheet.create` unless NativeWind can't achieve the style
- **Zustand** v5 — auth, cart, orders stores
- **react-native-appwrite** ^0.19 — Appwrite SDK for React Native
- **@stripe/stripe-react-native** 0.50.3 — native payment sheet
- **@sentry/react-native** ^7 — error tracking
- **expo-screen-orientation** — staff screen locks to landscape on mount

### Eureka-web
- **Next.js** 16.2.6 (App Router) · **React** 19
- **Tailwind CSS** v4 (via `@tailwindcss/postcss`)
- **Zustand** v5 — auth, cart, orders stores
- **@supabase/supabase-js** — Supabase client for all DB reads/writes
- **stripe** — server-side Stripe SDK (used in API routes only)
- **@stripe/react-stripe-js** + **@stripe/stripe-js** — `<Elements>` + `<PaymentElement>` rendered in a modal
- **react-hot-toast** — toast notifications
- **lucide-react** — SVG icons
- **clsx** — conditional class names

### Backends
- **Appwrite** (Singapore — `https://sgp.cloud.appwrite.io/v1`) — used by **mobile only**
- **Supabase** (`https://bcmekxmrckavxospltuh.supabase.co`) — used by **web only**; schema in `Eureka-web/supabase-schema.sql`
- **Stripe** — PaymentIntent flow, currency SGD; secret key server-side only in Next.js API routes

### Web API Routes (Next.js, replaces Appwrite Cloud Functions)
| Route | Purpose |
|---|---|
| `POST /api/calculate-cart` | Validates cart against live menu prices, applies promo codes server-side |
| `POST /api/create-checkout` | `action: "create"` — creates order + Stripe PaymentIntent + `order_dept_slots`; `action: "confirm"` — verifies payment, marks order received, returns `readyAt` |
| `POST /api/webhooks/stripe` | Stripe webhook — handles `payment_intent.succeeded` / `payment_intent.payment_failed` as fallback for out-of-band confirmations |
| `POST /api/verify-pin` | Validates staff PIN against `pin_hash` during sign-in |
| `POST /api/estimate-eta` | Accepts `categoryIds[]`, calls `calculate_dept_ready_at` for each, returns `minutesFromNow` for pre-checkout display |

---

## Auth Approach

### Mobile (`Eureka-mobile`)
Standard Appwrite Auth: `account.create()` registers an account, `account.createEmailPasswordSession()` creates a session. `getCurrentUser()` calls `account.get()` to resolve the session, then fetches the matching document from the `user` collection. The user object carries `{ id, accountId, name, email, avatar, role }`. Auth state is held in Zustand but not persisted — `fetchAuthenticatedUser()` re-checks on every app launch.

### Web (`Eureka-web`)
**No session, no password.** Identity is phone-number only:

- **Sign-up**: `createUser({ name, phone })` inserts a row into the Supabase `users` table. No Supabase Auth account is created.
- **Sign-in**: `getUserByPhone(phone)` queries the `users` table by `phone`. If a row exists, the user is logged in.
- **No verification**: Anyone who knows a registered phone number can sign in as that user.
- **Persistence**: Auth state (`isAuthenticated`, `user`) is persisted to `localStorage` via Zustand's `persist` middleware (`name: "eureka-auth"`). The web `User` type is `{ id, name, phone, role }`.

**Role gating**: `user.role` is read from the `users` table, defaulting to `"customer"`. The `"staff"` role is assigned manually in the Supabase console. Customer routes redirect to `/sign-in` if unauthenticated; staff routes redirect to `/staff` if `role === "staff"`.

---

## What Is Currently Implemented and Working

### Web (`Eureka-web`)
- Sign-up and sign-in flows (phone-only, with role-based redirect); staff sign-in requires PIN
- Menu browsing: text search (ilike), filter by category; items displayed grouped by category with section headers; responsive 3-column grid on desktop, single column on mobile
- Cart: add/remove/increase/decrease qty; same item with different `specialRequest` values becomes a separate line item; `categoryId` stored per item for ETA calculation; cart is a slide-in drawer (`CartDrawer`) opened from the top nav — no separate `/cart` page (redirects to `/search`)
- Pre-checkout ETA: `POST /api/estimate-eta` called from the cart drawer to show estimated wait before checkout
- Promo code redemption: validated server-side via `/api/calculate-cart`; `PERCENT` and `FIXED` types, per-user usage limit, min subtotal, max discount cap; race condition protected by `UNIQUE(promo_id, user_id)` DB constraint
- Checkout: `/api/create-checkout` creates order + Stripe PaymentIntent + `order_dept_slots` (via `calculate_dept_ready_at` RPC); if `totalCents === 0` order is marked received immediately; returns `readyAt`
- Stripe payment: `<PaymentElement>` rendered inside the `CartDrawer`; uses `redirect: "if_required"` so card payments confirm inline without a page redirect; non-card methods (bank redirect, etc.) open `/stripe-redirect` on completion
- Stripe webhook: `/api/webhooks/stripe` handles `payment_intent.succeeded` as fallback if the customer closes the browser before redirect
- Post-payment confirmation: `/api/create-checkout` with `action: "confirm"` verifies PaymentIntent, sets order to `"received"`, returns `readyAt` from `order_dept_slots`; `/stripe-redirect` handles three states: **success** (navigates to order detail after `POST_PAYMENT_REDIRECT_DELAY_MS`), **failure** (shows error UI and reopens cart after the same delay), and **3D Secure popup** (detects `window.opener` — the issuer auth tab opened by Stripe — closes itself with a friendly message so the original tab handles confirmation)
- Navigation: middleware redirects `/` → `/search`; fixed top nav bar with EurekaGO branding (fish logo), dynamic cart pill, and Profile link — no bottom tab bar, no desktop sidebar
- Customer order tracking: **removed from the customer UI**; the home screen (`/`) is no longer customer-facing (redirects to `/search`)
- Profile screen: displays name and phone; "Back to Menu" link to `/search`; shows up to `RECENT_ORDERS_LIMIT` recent paid orders fetched from Supabase on load (stored in orders store, trimmed to that limit); each order is a clickable card linking to `/order/[id]`
- Order detail page (`/order/[id]`): shows order number, colour-coded status badge, ready-by banner (visible when status is `received`, `preparing`, or `ready`), itemised line items with qty and special requests, price breakdown (subtotal + promo discount + total paid); accessible from the profile page
- Staff dashboard: three-column kanban (Received / Preparing / Ready); role-gated (redirects non-staff); optimistic status updates with error rollback; polls every 10 s for active orders and every 15 s for history; "Cooking X min" timer uses `updated_at`; History tab (collected orders); Settings tab with sign-out

---

## Supabase Data Model (web-authoritative)

Schema source: `Eureka-web/supabase-schema.sql`

| Table | Key columns |
|---|---|
| `users` | `id` (uuid pk), `name`, `phone` (unique), `role` ("customer"\|"staff"), `pin_hash`, `created_at` |
| `categories` | `id`, `name`, `description`, `has_queue` |
| `dept_config` | `id`, `category_id` (fk), `base_prep_minutes`, `gap_minutes`, `max_wait_minutes` |
| `menu` | `id`, `name`, `description`, `image_url`, `price` (numeric dollars), `category_id` (fk), `is_available` |
| `orders` | `id`, `user_id` (fk), `total` (numeric dollars), `order_number` (int, resets daily at 4am SGT via `daily_order_counter`), `is_paid`, `status`, `ready_at`, `updated_at`, `promo_id`, `promo_code`, `discount_cents`, `payment_intent_id`, `created_at` |
| `order_items` | `id`, `order_id` (fk), `menu_id` (fk), `name`, `price`, `qty`, `special_request` |
| `order_dept_slots` | `id`, `order_id` (fk), `category_id` (fk), `dept_ready_at` |
| `promo_codes` | `id`, `code_upper` (unique), `is_active`, `type` ("PERCENT"\|"FIXED"), `value`, `max_discount_cents`, `min_subtotal_cents`, `usage_limit_per_user` |
| `promo_redemptions` | `id`, `promo_id` (fk), `user_id` (fk), `order_id` (fk), `redeemed_at`, `discount_cents` |
| `daily_order_counter` | `business_date` (DATE pk), `last_number` (int) — tracks per-day order number; business day defined as SGT minus 4 h so 00:00–03:59 SGT rolls into the previous day |

**Order status flow:** `pending_payment` → `received` → `preparing` → `ready` → `collected` (also `cancelled` — set manually via Supabase console only, no customer-facing cancel UI). The `"paid"` value exists in the `OrderStatus` TypeScript type for UI rendering completeness but is not emitted by the current DB flow.

**`orders.updated_at`** is present in the schema with an auto-update trigger (`trg_orders_updated_at`). If the column is missing from an existing DB, run: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`

---

## Web Environment Variables

```
# Supabase (public — safe to expose client-side)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

# Supabase service role key (server-side only — used in API routes)
SUPABASE_SECRET_KEY

# Stripe (publishable key — client-side; secret key — server-side only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY

# Stripe webhook signing secret — from Stripe Dashboard → Developers → Webhooks
STRIPE_WEBHOOK_SECRET

# Optional (defaults to "sgd")
STRIPE_CURRENCY
```

---

## What Is Not Yet Built

- Delivery, dine-in table management, in-store POS, inventory management (explicit non-goals for MVP)
- `orders.ready_at` is populated from `order_dept_slots` but not surfaced separately to the customer beyond the ETA label

## Vestigial / Unused Files (web)

- `constants/index.ts` — carried over from the mobile port; exports hardcoded `CATEGORIES` (Burger, Pizza, Wrap, Burrito), `offers`, `sides`, `toppings`, and PNG asset references. None of these are imported anywhere in the web app. The web loads categories dynamically from Supabase via `getCategories()`.

---

## Key Decisions

**Web uses Supabase; mobile uses Appwrite.** The two apps no longer share a backend. The Supabase schema (`supabase-schema.sql`) is the authoritative data model for the web app.

**Web auth is phone-only with no Supabase Auth session.** Users are plain rows in the `users` table identified by phone number. "Login" is a DB lookup. Auth state lives in localStorage via Zustand persist.

**Checkout logic lives in Next.js API routes, not cloud functions.** `/api/calculate-cart` and `/api/create-checkout` use the Supabase service role key (`SUPABASE_SECRET_KEY`) to bypass RLS and the Stripe secret key — never expose these client-side.

**Monetary unit boundary.** API routes and promo logic use cents (integers). `orders.total` and `menu.price` are stored as dollars (`NUMERIC(10,2)`). Convert at the boundary: `cents = Math.round(dollars * 100)`.

**Promo validation is server-side authoritative.** `validatePromoCode()` in `lib/supabase.ts` is a client-side preview only. The actual enforcement is in `/api/calculate-cart` and `/api/create-checkout`. A `UNIQUE(promo_id, user_id)` constraint on `promo_redemptions` prevents double-redemption under concurrent requests; the API routes catch Postgres error `23505` and return a friendly error.

**Customer order UX is intentionally minimal.** Customers see estimated wait time and a "ready for collection" banner — no intermediate status steps. No cancel button is exposed to customers; orders can only be cancelled by editing the DB directly.

**All tuneable constants live in `lib/config.ts`.** This is the single source of truth for values like `RECENT_ORDERS_LIMIT`, polling intervals, query limits, order number padding, and the fallback `DEFAULT_DEPT_MAX_WAIT_MINUTES`. Supabase table names and the `calculate_dept_ready_at` RPC name are also exported from there. DB-only settings (dept_config values, daily reset trigger, RLS) are documented with comments in the same file.

**Staff polling, not Realtime.** Web polls Supabase every `STAFF_ACTIVE_ORDERS_POLL_MS` (default 10 s) for active orders and every `STAFF_HISTORY_POLL_MS` (default 15 s) for history. Both are in `lib/config.ts`.

**Cart is not persisted.** `cart.store.ts` is plain Zustand with no `persist` middleware — cart is lost on page refresh.

**Orders store IS persisted.** `orders.store.ts` uses Zustand `persist` to localStorage (`name: "recent-orders"`) to keep up to `RECENT_ORDERS_LIMIT` orders across sessions. The limit is defined in `lib/config.ts`.

**Each app has its own seed script.** `Eureka-web/lib/seed.ts` targets Supabase (seeds Drinks / Porridge / Fish Soup categories with matching menu items); run with `npx tsx --env-file=.env.local lib/seed.ts`. `Eureka-mobile/lib/seed.ts` + `lib/data.ts` target Appwrite; run with `npx tsx lib/seed.ts`. Never run either against production.
