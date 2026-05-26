<div align="center">
  <img width="160" alt="EurekaGO logo" src="https://github.com/user-attachments/assets/e97c3863-a5e5-47e3-b50a-c7efe4b10e5d" />

  # Eureka! — F&B Pre-order & Payment System

  A grab-and-go pre-order platform for high-volume food stalls.
  Customers browse a menu, add items to cart, and pay before their order enters the kitchen queue.
  Staff manage a live order dashboard and move cards through a kanban board as orders are prepared and collected.

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
  ![React Native](https://img.shields.io/badge/React_Native-0.81-61dafb?style=flat-square&logo=react)
  ![Supabase](https://img.shields.io/badge/Supabase-green?style=flat-square&logo=supabase)
  ![Stripe](https://img.shields.io/badge/Stripe-SGD-6772e5?style=flat-square&logo=stripe)
</div>

---

## Monorepo Structure

```
Eureka-App/
├── Eureka-web/      Next.js web app — Supabase backend   ← active development
└── Eureka-mobile/   Expo + React Native (iOS & Android) — Appwrite backend
```

> The two apps do not share a backend. All active development is in `Eureka-web`.

---

## Eureka-web

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Zustand · Supabase · Stripe

**Customer flow**
- Phone-number sign-in (no password, no verification — DB lookup only)
- Menu browsing with text search and category filters; items grouped by category in a responsive grid
- Slide-in cart drawer with per-item special requests, promo code redemption, and pre-checkout ETA
- Stripe `<PaymentElement>` inside the drawer; webhook fallback for out-of-band confirmations
- Post-payment order detail page with ready-by time; recent orders on profile page

**Staff dashboard**
- PIN-gated sign-in (`role = "staff"` set manually in Supabase console)
- Kanban board: Received → Ready → Collected with live polling (10 s / 15 s)
- Order history tab; optimistic status updates with error rollback

**Queue-aware ETA**
- `calculate_dept_ready_at` DB function slots each order into the appropriate prep queue
- Daily order numbers reset at 4 am SGT

### Quick start

```bash
cd Eureka-web
npm install
cp .env.local.example .env.local   # fill in values — see Eureka-web/README.md
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

See [`Eureka-web/README.md`](Eureka-web/README.md) for full environment variable reference, database setup, and Stripe webhook configuration.

---

## Eureka-mobile

Legacy React Native app; the original version of the product. Uses Appwrite for auth and database.

**Stack:** Expo · React Native · Expo Router · NativeWind · Zustand · Appwrite · Stripe

```bash
cd Eureka-mobile
npm install
npx expo start
```

See [`Eureka-mobile/README.md`](Eureka-mobile/README.md) for setup details.

---

## Backends

| App | Backend | Auth |
|---|---|---|
| `Eureka-web` | [Supabase](https://supabase.com) · schema in `Eureka-web/supabase-schema.sql` | Phone lookup — plain `users` table row, no Supabase Auth |
| `Eureka-mobile` | [Appwrite](https://appwrite.io) (Singapore) | Email + password via Appwrite Auth |

Both apps use [Stripe](https://stripe.com) for payments (SGD, PaymentIntent flow).

---

## MVP Non-goals

Delivery · dine-in table management · in-store POS · inventory management
