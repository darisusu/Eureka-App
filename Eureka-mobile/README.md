# Eureka Preorder & Payment System

Lightweight preorder + prepay mobile app for grab-and-go food stalls. Designed around fast pickup, reliable prep-time estimates, and low operational overhead.

## What It Does

Customers browse a menu, add items to cart (with per-item special requests), and pay before the order enters the kitchen queue. Staff see a live order dashboard and update status as orders are prepared and collected.

**Non-goals (MVP):** delivery, dine-in table management, in-store POS, inventory management.

## Tech Stack

- [Expo](https://expo.dev) + React Native
- Expo Router (file-based navigation)
- Zustand (state management)
- [Appwrite](https://appwrite.io) (auth, database, storage, cloud functions)
- NativeWind (Tailwind-style classes)
- Stripe (payments)

## Getting Started

**1. Install dependencies**
```bash
npm install
```

**2. Configure environment**

Create a `.env` file — see `docs/appwrite.md` for the full list of required variables. At minimum:
```
EXPO_PUBLIC_APPWRITE_ENDPOINT=...
EXPO_PUBLIC_APPWRITE_PROJECT_ID=...
```

**3. Run**
```bash
npx expo start
```

## Seeding Menu Data

Clears and repopulates categories + menu items in Appwrite. Only run against development data.

```bash
npx tsx lib/seed.ts
```

Ensure `lib/data.ts` has valid image URLs before seeding — the script uploads images to Appwrite Storage.

## Docs

- [`docs/prd.md`](docs/prd.md) — product requirements
- [`docs/appwrite.md`](docs/appwrite.md) — collections schema + cloud functions spec
- [`docs/status-tracking.md`](docs/status-tracking.md) — order status flow
- [`CLAUDE.md`](CLAUDE.md) — architecture and codebase context for AI-assisted development
