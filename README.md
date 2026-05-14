# Eureka! — F&B Pre-order & Payment System

<img width="500" height="600" alt="image" src="https://github.com/user-attachments/assets/e97c3863-a5e5-47e3-b50a-c7efe4b10e5d" />

Eureka is a grab-and-go pre-order and prepay platform for high-volume food stalls. Customers browse a menu, add items to cart, and pay before their order enters the kitchen queue. Staff see a live dashboard and update order status as items are prepared and collected.

**Non-goals (MVP):** delivery, dine-in table management, in-store POS, inventory management.

---

## Monorepo Structure

```
Eureka-App/
├── Eureka-mobile/   Expo + React Native app (iOS & Android) — Appwrite backend
└── Eureka-web/      Next.js web app — Supabase backend
```

> **Active development:** `Eureka-web` only. The two apps no longer share a backend.

---

## Eureka-web (active)

Next.js web app covering the full customer flow and staff dashboard.

**Stack:** Next.js · Tailwind CSS v4 · Zustand · Supabase · Stripe

**Features:**
- Phone-number sign-in (no password); staff sign-in requires PIN
- Menu browsing with search and category filters
- Cart with special requests and promo code redemption
- Stripe payment via `<PaymentElement>` modal; webhook fallback for out-of-band confirmation
- Queue-aware ETA: checkout populates `order_dept_slots` via the `calculate_dept_ready_at` DB function
- Customer home: shows estimated wait time, switches to "ready for collection" card when staff marks order ready
- Staff kanban dashboard (Received → Preparing → Ready → Collected) with live polling

```bash
cd Eureka-web
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in the required variables (see [Eureka-web/README.md](Eureka-web/README.md)).

---

## Eureka-mobile (legacy)

React Native app built with Expo. Original version of the product; uses Appwrite for backend.

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
| `Eureka-web` | [Supabase](https://supabase.com) — schema in `Eureka-web/supabase-schema.sql` | Phone lookup (plain DB row, no Supabase Auth) |
| `Eureka-mobile` | [Appwrite](https://appwrite.io) (Singapore) | Email + password via Appwrite Auth |

Both apps use [Stripe](https://stripe.com) for payments (SGD, PaymentIntent flow).
