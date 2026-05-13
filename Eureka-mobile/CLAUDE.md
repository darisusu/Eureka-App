# Eureka — Claude Code Context

Lightweight preorder + prepay mobile app for grab-and-go food stalls. Expo + React Native frontend, Appwrite backend, Stripe payments.

## Architecture

```
app/            Expo Router screens and layouts
  (auth)/       Sign-in / sign-up screens
  (tabs)/       Main tab navigation (customer-facing)
  staff.tsx     Staff order dashboard (role-gated)
  stripe-redirect.tsx  Post-payment redirect handler
components/     Reusable UI components
store/          Zustand stores (auth, cart, orders)
lib/
  appwrite.ts   Appwrite client + all API helper functions
  useAppwrite.ts  Custom hook for Appwrite data fetching
  seed.ts       Seed script — clears and repopulates categories + menu
  data.ts       Source data used by seed script (image URLs must be valid)
functions/      Appwrite cloud functions (Node.js, deployed separately)
  calculate-cart/   Validates cart and applies promo codes server-side
  create-checkout/  Creates order + Stripe PaymentIntent
  stripe-webhook/   Handles Stripe webhook events
docs/           Design docs and specs (prd.md, appwrite.md, etc.)
tests/          Node scripts for manual data integrity checks
constants/      Shared constants (index.ts)
```

## Tech Stack

- Expo + React Native
- Expo Router (file-based navigation)
- NativeWind (Tailwind classes via `className` prop — use NativeWind v4 API)
- Zustand (auth, cart, orders stores)
- Appwrite (auth, database, storage, cloud functions)
- Stripe (payments via `@stripe/stripe-react-native`)

## Zustand Stores

| File | State | Notes |
|------|-------|-------|
| `store/auth.store.ts` | `user`, `setUser`, `clearUser` | Appwrite user profile doc |
| `store/cart.store.ts` | `items`, `addItem`, `removeItem`, `clearCart` | Cart line items with qty + specialRequest |
| `store/orders.store.ts` | `orders`, `setOrders` | Customer order history |

## Appwrite Data Model

**user**
- `name`, `email`, `accountId`, `avatar` (url)
- `role` enum: `"customer"` (default) | `"staff"` — only changed manually in Appwrite console
- Document `$id` = Appwrite `account.$id` (1:1 mapping, fetch profile by id)

**orders**
- `userId`, `total` (double), `orderNumber` (string), `isPaid` (boolean)
- `status` enum: `pending_payment` → `paid` → `received` → `preparing` → `ready` → `collected`
- `promoId?`, `promoCode?`, `discountCents?` (integer, cents)
- `paymentIntentId?` (Stripe)

**order_items**
- `orderId`, `menuId`, `name`, `price` (double), `qty` (integer), `specialRequest?`

**menu**
- `name`, `description`, `image_url`, `price`, `categories`, `prep_time_min`

**categories**
- Standard category doc

**promo_codes**
- `codeUpper` (unique, uppercase), `isActive` (boolean)
- `type` enum: `"PERCENT"` | `"FIXED"`
- `value`: percent = e.g. 10 means 10%; fixed = cents e.g. 300 = $3.00
- `maxDiscountCents?`, `minSubtotalCents`, `usageLimitPerUser` (set to 1)

**promo_redemptions**
- `promoId`, `userId`, `orderId`, `redeemedAt` (datetime), `discountCents?`

## Cloud Functions

### `calculate-cart`
Validates cart items against menu prices and applies promo code logic server-side.

### `create-checkout` (main payment flow)
**Request — create:**
```json
{ "action": "create", "userId": "", "items": [{ "menuId": "", "quantity": 1, "specialRequest": "" }], "promoCode": "", "customerEmail": "" }
```
**Request — confirm:**
```json
{ "action": "confirm", "userId": "", "orderId": "", "paymentIntentId": "" }
```
**Response:**
- `orderId`, `orderNumber`, `paymentRequired` (boolean)
- `paymentIntentId`, `clientSecret` (null if paymentRequired is false)
- `subtotalCents`, `discountCents`, `totalCents`, `promo`
- If `totalCents === 0`, order is marked paid immediately with no Stripe step.

### `stripe-webhook`
Handles Stripe webhook events to reconcile payment status.

## Environment Variables

Client (`.env`):
```
EXPO_PUBLIC_APPWRITE_ENDPOINT
EXPO_PUBLIC_APPWRITE_PROJECT_ID
EXPO_PUBLIC_APPWRITE_DATABASE_ID
EXPO_PUBLIC_APPWRITE_BUCKET_ID
EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_MENU_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_ORDER_ITEMS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_PROMO_CODES_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_CALCULATE_ORDER_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_CREATE_CHECKOUT_FUNCTION_ID
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Cloud functions (set in Appwrite console per function):
- `calculate-cart`: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`, `APPWRITE_MENU_COLLECTION_ID`, `APPWRITE_PROMO_CODES_COLLECTION_ID`, `APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID`
- `create-checkout`: all of the above + `APPWRITE_ORDERS_COLLECTION_ID`, `APPWRITE_ORDER_ITEMS_COLLECTION_ID`, `STRIPE_SECRET_KEY`, `STRIPE_CURRENCY` (default: `sgd`), `STRIPE_API_VERSION` (default: `2023-10-16`)

## Key Conventions

- **Monetary values**: stored in cents (integer) in cloud functions and promo logic; stored as doubles (dollars) in `orders.total` and `menu.price` — be careful at the boundary.
- **Role gating**: `user.role` is the source of truth. Check it from the Appwrite user profile doc, not from auth session.
- **NativeWind**: use `className` prop. Do not use `StyleSheet.create` unless NativeWind cannot achieve the style.
- **Appwrite queries**: use the `Query` helpers from `react-native-appwrite`, not raw strings.
- **Seeding**: run with `npx tsx lib/seed.ts` — clears and repopulates categories + menu, never run against production data.

## Current In-Progress Work (branch: feat-staffScreen)

- `app/staff.tsx` — staff order dashboard (role-gated, active development)
- `lib/appwrite.ts` — API helpers supporting the staff screen

## Docs Reference

- `docs/prd.md` — full product requirements
- `docs/appwrite.md` — authoritative collections + functions spec
- `docs/staff-ui.md` — staff screen design spec
- `docs/status-tracking.md` — order status flow
- `docs/createCheckout.md` — checkout flow details
- `docs/calculateCart.md` — cart calculation logic
- `tests/README.md` — how to run data integrity check scripts
