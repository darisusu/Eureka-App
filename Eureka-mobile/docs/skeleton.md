## App routing
_layout.tsx — app bootstrap: fonts, auth fetch, Sentry, root router
_layout.tsx — auth layout wrapper (login graphics, redirect if authed)
sign-in.tsx — sign in UI + Appwrite session
sign-up.tsx — sign up UI + Appwrite user creation
_layout.tsx — tab bar + auth guard
index.tsx — home/offers screen
search.tsx — menu search + filter + menu list
cart.tsx — cart + order creation
profile.tsx — profile stub (not built yet)

## Data + backend
appwrite.ts — Appwrite client + API helpers (auth, menu, orders)
useAppwrite.ts — reusable data‑fetching hook with loading/error
seed.ts — seed script to populate Appwrite menu/categories
data.ts — dummy data for seeding

## State
auth.store.ts — auth state (isAuthenticated, user, fetch user)
cart.store.ts — cart state (add/remove/qty + total)

## UI components
MenuCard.tsx — menu item card + modal for special request
CartItem.tsx — cart row with qty controls + special request display
CartButton.tsx — cart icon + badge
CustomButton.tsx — styled button
CustomHeader.tsx — header with back button
CustomInput.tsx — styled input
Filter.tsx — category filter chips
SearchBar.tsx — search input

## Types + constants
type.d.ts — shared TypeScript types (MenuItem, Order, CartItem, etc.)
index.ts — static icons/images + sample UI data

## Styling
global.css — NativeWind/Tailwind styles
tailwind.config.js — Tailwind config
nativewind-env.d.ts — NativeWind types