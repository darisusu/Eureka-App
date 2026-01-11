# Eureka Preorder & Payment System (MVP)

Lightweight preorder + prepay mobile app for grab-and-go food stalls. Designed around fast pickup, reliable prep-time estimates, and low operational overhead.

## Product Summary (from PRD)

Goals:
- Preorder + prepay before food enters the kitchen queue
- Reliable estimated ready times
- Clear order numbers and status visibility
- Minimal operations for staff

Non-goals (MVP):
- Delivery
- Dine-in table management
- In-store POS
- Inventory management

## Current Features Implemented

Customer:
- Sign up / sign in (Appwrite)
- Menu browse + search + category filter
- Cart with quantity adjustments
- Special request per item (stored on order items)
- Create order + order items in Appwrite

Platform:
- Expo Router navigation
- Zustand state for auth + cart
- Appwrite client integration

## In Progress / Missing (per PRD)

Customer:
- Payment integration (Stripe or equivalent)
- Estimated ready time display and calculation
- Order status tracking UI
- Order history
- Notifications (order received / ready)

Staff:
- Admin/staff role gating
- Staff order dashboard with status updates

## Tech Stack

- Expo + React Native
- Expo Router (file-based navigation)
- Zustand (state)
- Appwrite (auth + database + storage)
- NativeWind (Tailwind-style classes)

## Project Structure

- `app/` screens and layouts
- `components/` reusable UI
- `store/` Zustand stores (auth, cart)
- `lib/appwrite.ts` Appwrite client + API helpers
- `lib/seed.ts` seed script for menu/category data
- `lib/data.ts` dummy data source for seeding

## Environment Setup

Create a `.env` file with:
```
EXPO_PUBLIC_APPWRITE_ENDPOINT=...
EXPO_PUBLIC_APPWRITE_PROJECT_ID=...
```

## Appwrite Collections

Required collections:
- `user`
- `categories`
- `menu` (fields: name, description, image_url, price, categories, prep_time_min)
- `orders` (userId, status, isPaid, total, orderNumber)
- `order_items` (orderId, menuId, name, price, qty, specialRequest)


## Running the App

Install dependencies:
```
npm install
```

Run:
```
npx expo start
```

## Seeding Appwrite Data

The seed script clears and repopulates categories + menu:
```
node -e "import('./lib/seed.ts').then(m => m.default())"
```

Make sure `lib/data.ts` has valid image URLs; the seed script uploads images to Appwrite storage.

## Next Steps (Suggested)

1) Add payment flow before order creation
2) Implement order history screen
3) Implement admin/staff protected section
4) Add ETA calculation using `prep_time_min`

