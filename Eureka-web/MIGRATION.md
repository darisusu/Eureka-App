# Mobile → Web Migration

Eureka started as an Expo + React Native app (`Eureka-mobile`) and was ported to a Next.js web app (`Eureka-web`). This document summarises what changed, what stayed the same, and what was dropped.

> **Note:** After the initial port, `Eureka-web` migrated from Appwrite to **Supabase** as its backend, and from Appwrite Cloud Functions to **Next.js API routes**. The "What Was Retained" section below reflects the initial port state; see `supabase-schema.sql` and `README.md` for the current web architecture.

---

## What Changed

### Framework & Runtime
| | Mobile | Web |
|---|---|---|
| Framework | Expo + React Native | Next.js 16 (App Router) |
| Navigation | Expo Router (file-based) | Next.js App Router (file-based) |
| Styling | NativeWind v4 (`className` on RN primitives) | Tailwind CSS v4 (standard HTML/CSS) |
| UI primitives | `View`, `Text`, `Image`, `TouchableOpacity` | Plain HTML elements (`div`, `p`, `img`, `button`) |

### Appwrite SDK
The same Appwrite backend is used, but the client SDK changed:
- Mobile: `react-native-appwrite` — required `.setPlatform("com.SGBoleh.eureka")`
- Web: `appwrite` — no platform identifier needed

### Stripe SDK
- Mobile: `@stripe/stripe-react-native`
- Web: `@stripe/react-stripe-js` + `@stripe/stripe-js`

### Environment Variables
Prefix changed from `EXPO_PUBLIC_` to `NEXT_PUBLIC_`. All variable names are otherwise identical.

### Alerts & Notifications
- Mobile: native `Alert.alert()` dialogs
- Web: `react-hot-toast` toast notifications

### Icons
- Mobile: image assets (PNG files from `constants/images`)
- Web: `lucide-react` SVG icon components

### Navigation / Layout
- Mobile: bottom tab bar (floating pill, always visible)
- Web: floating bottom tab bar only — no desktop nav, no Home tab (tabs: Menu / Cart / Profile); `/` redirects to `/search` via middleware

---

## What Was Retained

Everything business-logic related was kept as-is:

- **Same screen structure** — `(auth)/sign-in`, `(auth)/sign-up`, `(tabs)/` (home, search, cart, profile), `staff`, `stripe-redirect`
- **Same Appwrite backend** — same database, collections, cloud functions, and storage bucket
- **Same data model** — `user`, `orders`, `order_items`, `menu`, `categories`, `promo_codes`, `promo_redemptions`
- **Same Zustand stores** — `auth.store.ts`, `cart.store.ts`, `orders.store.ts` (logic identical)
- **Same `lib/appwrite.ts` API helpers** — only the import line changed (`react-native-appwrite` → `appwrite`)
- **Same `lib/useAppwrite.ts`** custom hook
- **Same components** — `CartItem`, `CheckoutBar`, `CustomButton`, `CustomInput`, `Filter`, `MenuCard`, `SearchBar`
- **Same auth & role-gating logic** — staff redirect, customer redirect, `user.role` as source of truth
- **Same checkout flow** — `calculate-cart` and `create-checkout` cloud functions, Stripe PaymentIntent, promo codes

---

## What Was Removed

These mobile-specific things were dropped and have no equivalent in the web project:

- `CartButton.tsx` — cart access is now via the tab nav directly
- `CustomHeader.tsx` — Next.js layout handles headers
- `lib/data.ts` and `lib/seed.ts` — seeding scripts (still in mobile project if needed)
- `functions/` folder — cloud functions live in Appwrite, not in either project folder
- `tests/` and `docs/` folders — kept in mobile project only
- `menu/` folder — mobile-only
- Sentry (`@sentry/react-native`) — not set up in web
- All Expo packages — `expo`, `expo-router`, `expo-font`, `expo-splash-screen`, etc.
- All React Native packages — `react-native`, `react-native-screens`, `react-native-safe-area-context`, etc.

---

## Post-Migration Changes (web-only, after initial port)

Changes made to `Eureka-web` after the migration and the Appwrite → Supabase switch:

| What changed | Detail |
|---|---|
| Backend | Appwrite → Supabase; cloud functions → Next.js API routes |
| Auth | Email + password → phone-number lookup (no session); staff require PIN |
| Phone normalisation | SG numbers normalised to `+65XXXXXXXX` on sign-in and sign-up |
| Navigation | Removed bottom tab bar; fixed top nav bar with EurekaGO branding (fish logo), dynamic cart pill, and Profile link; `/` redirects to `/search` |
| Branding | App renamed **EurekaGO**; fish mascot logo (`/public/fish.png`) in top nav |
| Cart UX | Cart is now a slide-in drawer (`CartDrawer`); no separate `/cart` page (redirects to `/search`) |
| Menu layout | Menu grouped by category with section headers; responsive `grid-cols-1 sm:grid-cols-3` layout |
| Customer order UX | Removed live order tracking screen; customers see ETA post-checkout and order history on the profile page |
| Database | `orders.updated_at` column + trigger; `daily_order_counter` table for per-day order numbering |
| Order numbering | `order_number` resets daily at 4am SGT (business day boundary) via `daily_order_counter` |
| Promo integrity | `UNIQUE(promo_id, user_id)` constraint on `promo_redemptions` to prevent concurrent double-redemption |
| Stripe webhook | `/api/webhooks/stripe` added as fallback for out-of-band payment confirmation |
| ETA (cart) | Pre-checkout ETA shown in cart drawer via `POST /api/estimate-eta` |
| ETA (cart, legacy) | Cart ETA dynamically fetched from `dept_config.max_wait_minutes` (was hardcoded) |

---

## Summary

The migration was mostly a **platform swap** — the product, backend, and business logic are unchanged. The main work was replacing React Native primitives and Expo tooling with standard HTML/CSS and Next.js conventions, and swapping SDK packages for their web equivalents. The codebase structure is intentionally similar to make the two projects easy to cross-reference.
