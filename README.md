# Eureka! — F&B Pre-order & Payment System

<img width="500" height="600" alt="image" src="https://github.com/user-attachments/assets/e97c3863-a5e5-47e3-b50a-c7efe4b10e5d" />

Eureka is a grab-and-go pre-order and prepay platform for high-volume food stalls. Customers browse a menu, add items to cart, and pay before their order enters the kitchen queue. Staff see a live dashboard and update order status as items are prepared and collected.

**Non-goals (MVP):** delivery, dine-in table management, in-store POS, inventory management.

---

## Monorepo Structure

```
Eureka-App/
├── Eureka-mobile/   Expo + React Native app (iOS & Android)
└── Eureka-web/      Next.js web app
```

Both apps share the same Appwrite backend and Stripe integration.

---

## Eureka-mobile

React Native app built with Expo. Covers the full customer flow (browse → cart → pay) and a role-gated staff order dashboard.

**Stack:** Expo · React Native · Expo Router · NativeWind · Zustand · Appwrite · Stripe

```bash
cd Eureka-mobile
npm install
npx expo start
```

See [`Eureka-mobile/README.md`](Eureka-mobile/README.md) for setup details and docs references.

---

## Eureka-web

Next.js web version of the Eureka frontend. Mirrors the mobile app's screens and connects to the same Appwrite backend.

**Stack:** Next.js · Tailwind CSS · Zustand · Appwrite

```bash
cd Eureka-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Backend

Both apps use a shared [Appwrite](https://appwrite.io) project for auth, database, storage, and cloud functions, and [Stripe](https://stripe.com) for payments.

Cloud functions live in `Eureka-mobile/functions/`:
- `calculate-cart` — validates cart and applies promo codes server-side
- `create-checkout` — creates the order and Stripe PaymentIntent
- `stripe-webhook` — reconciles payment status from Stripe events

See [`Eureka-mobile/docs/appwrite.md`](Eureka-mobile/docs/appwrite.md) for the full schema and environment variable reference.
