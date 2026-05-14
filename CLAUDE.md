# Eureka — Claude Code Context

Eureka is a grab-and-go pre-order and prepay platform for high-volume food stalls. Customers browse a menu, add items to a cart, pay via Stripe before their order enters the kitchen queue, then track their order status on the home screen. Staff use a role-gated dashboard to move orders through a kanban board (Received → Preparing → Ready → Collected). The MVP explicitly excludes delivery, dine-in table management, in-store POS, and inventory management.

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
| `POST /api/create-checkout` | `action: "create"` — creates order + Stripe PaymentIntent; `action: "confirm"` — verifies payment, marks order received |

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
- Sign-up and sign-in flows (phone-only, with role-based redirect)
- Menu browsing: text search (ilike), filter by category_id
- Cart: add/remove/increase/decrease qty; same item with different `specialRequest` values becomes a separate line item
- Promo code redemption: validated server-side via `/api/calculate-cart`; `PERCENT` and `FIXED` types, per-user usage limit, min subtotal, max discount cap
- Checkout: `/api/create-checkout` creates order + Stripe PaymentIntent; if `totalCents === 0` order is marked received immediately
- Stripe payment: `<PaymentElement>` in a modal overlay, redirects through `/stripe-redirect` on completion
- Post-payment confirmation: `/api/create-checkout` with `action: "confirm"` verifies PaymentIntent and sets order status to `"received"`
- Order status tracking: home screen reads from Zustand `recentOrders` (static — does not poll)
- Profile screen: displays name and phone, shows up to 3 recent orders fetched from Supabase on load
- Staff dashboard: three-column kanban (Received / Preparing / Ready); optimistic status updates with error rollback; polls every 10 s for active orders and every 15 s for history; History tab; Settings tab with sign-out

---

## Supabase Data Model (web-authoritative)

Schema source: `Eureka-web/supabase-schema.sql`

| Table | Key columns |
|---|---|
| `users` | `id` (uuid pk), `name`, `phone` (unique), `role` ("customer"\|"staff"), `pin_hash`, `created_at` |
| `categories` | `id`, `name`, `description`, `has_queue` |
| `dept_config` | `id`, `category_id` (fk), `base_prep_minutes`, `gap_minutes`, `max_wait_minutes` |
| `menu` | `id`, `name`, `description`, `image_url`, `price` (numeric dollars), `category_id` (fk), `is_available` |
| `orders` | `id`, `user_id` (fk), `total` (numeric dollars), `order_number` (int, auto via sequence trigger), `is_paid`, `status`, `ready_at`, `promo_id`, `promo_code`, `discount_cents`, `payment_intent_id`, `created_at` |
| `order_items` | `id`, `order_id` (fk), `menu_id` (fk), `name`, `price`, `qty`, `special_request` |
| `order_dept_slots` | `id`, `order_id` (fk), `category_id` (fk), `dept_ready_at` |
| `promo_codes` | `id`, `code_upper` (unique), `is_active`, `type` ("PERCENT"\|"FIXED"), `value`, `max_discount_cents`, `min_subtotal_cents`, `usage_limit_per_user` |
| `promo_redemptions` | `id`, `promo_id` (fk), `user_id` (fk), `order_id` (fk), `redeemed_at`, `discount_cents` |

**Order status flow:** `pending_payment` → `received` → `preparing` → `ready` → `collected`

**Note:** `orders` has no `updated_at` column. The staff screen's "Cooking X min" timer uses `created_at` as a fallback after a page refresh — timing will only be accurate for the session in which status was changed. Consider adding `updated_at` with an auto-update trigger.

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

# Optional (defaults to "sgd")
STRIPE_CURRENCY
```

---

## What Is Partially Done

- **Home screen order status**: reads from Zustand (`recentOrders[0]`), shows a static progress bar. Does **not** poll Supabase for live status updates.
- **Estimated prep time**: hardcoded as "20-30 min"; not calculated from `dept_config` / `order_dept_slots`.
- **`dept_config` / `order_dept_slots`**: schema is in place but web checkout doesn't populate `order_dept_slots` yet.

---

## What Is Not Yet Built

- Live order status updates to the customer (Supabase Realtime subscription or polling on home screen)
- Dynamic ETA using `dept_config` queue math and `order_dept_slots`
- Stripe webhook handler
- Delivery, dine-in table management, in-store POS, inventory management (explicit non-goals for MVP)

---

## Key Decisions

**Web uses Supabase; mobile uses Appwrite.** The two apps no longer share a backend. The Supabase schema (`supabase-schema.sql`) is the authoritative data model for the web app.

**Web auth is phone-only with no Supabase Auth session.** Users are plain rows in the `users` table identified by phone number. "Login" is a DB lookup. Auth state lives in localStorage via Zustand persist.

**Checkout logic lives in Next.js API routes, not cloud functions.** `/api/calculate-cart` and `/api/create-checkout` use the Supabase service role key (`SUPABASE_SECRET_KEY`) to bypass RLS and the Stripe secret key — never expose these client-side.

**Monetary unit boundary.** API routes and promo logic use cents (integers). `orders.total` and `menu.price` are stored as dollars (`NUMERIC(10,2)`). Convert at the boundary: `cents = Math.round(dollars * 100)`.

**Promo validation is server-side authoritative.** `validatePromoCode()` in `lib/supabase.ts` is a client-side preview only. The actual enforcement is in `/api/calculate-cart` and `/api/create-checkout`.

**Staff polling, not Realtime.** Web polls Supabase every 10 s for active orders and every 15 s for history.

**Cart is not persisted.** `cart.store.ts` is plain Zustand with no `persist` middleware — cart is lost on page refresh.

**Orders store IS persisted.** `orders.store.ts` uses Zustand `persist` to localStorage to keep the last 3 orders across sessions.

**Seeding scripts live in mobile only.** `lib/seed.ts` and `lib/data.ts` are in `Eureka-mobile/` only. Run with `npx tsx lib/seed.ts`. Never run against production.
