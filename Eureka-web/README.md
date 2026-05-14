# Eureka-web

Next.js web app for the Eureka grab-and-go pre-order platform.

## Stack

- **Next.js** 16 (App Router) · **React** 19
- **Tailwind CSS** v4
- **Zustand** v5 — auth, cart, orders stores (auth + orders persisted to localStorage)
- **Supabase** — database (schema in `supabase-schema.sql`)
- **Stripe** — PaymentIntent flow; `<PaymentElement>` modal client-side, secret key server-side only

## Setup

```bash
npm install
cp .env.local.example .env.local  # fill in values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SECRET_KEY` | Supabase project → Settings → API → service_role key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks (signing secret) |
| `STRIPE_CURRENCY` | Optional, defaults to `sgd` |

## Database

Schema is in `supabase-schema.sql`. Run it in the Supabase SQL Editor to create all tables, indexes, triggers, and the `calculate_dept_ready_at` function.

**Required migrations** (if running against a DB created before these were added):
```sql
-- Add updated_at to orders (needed for staff timing accuracy)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Prevent promo double-redemption under concurrent requests
ALTER TABLE promo_redemptions ADD CONSTRAINT uq_promo_user UNIQUE (promo_id, user_id);
```

## Stripe Webhook Setup

1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://<your-domain>/api/webhooks/stripe`
3. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`

For local development: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Auth

No Supabase Auth session. Users are plain rows in the `users` table:
- **Customers**: sign in by phone number (DB lookup only, no verification)
- **Staff**: sign in by phone + PIN (hashed with bcrypt in `pin_hash` column); role must be set to `"staff"` in Supabase console

## Key Architecture Notes

- All monetary values in API routes use **cents** (integers). DB stores dollars (`NUMERIC(10,2)`). Convert at the boundary: `cents = Math.round(dollars * 100)`.
- Server-side API routes (`/api/*`) use `SUPABASE_SECRET_KEY` to bypass RLS. Never use this key client-side.
- Cart is **not** persisted (lost on refresh). Orders store IS persisted (last 3 orders kept in localStorage).
- Staff dashboard polls every 10 s (active orders) and 15 s (history). No Supabase Realtime.
- `/` redirects to `/search` (middleware). The customer landing screen is the menu.
