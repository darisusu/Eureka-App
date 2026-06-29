@../CLAUDE.md
@AGENTS.md

# Eureka-web — Quick Reference

## Dev Commands

```bash
npm run dev              # Start dev server at localhost:3000
npm run build            # Production build
npx tsx --env-file=.env.local lib/seed.ts   # Seed DB (never run against prod)
```

## Directory Layout

```
app/
├── (auth)/              Sign-in, sign-up pages
├── (tabs)/              Customer pages: search, profile, cart (redirects), order/[id]
├── api/                 6 API routes (calculate-cart, create-checkout, estimate-eta,
│                        update-order-status, verify-pin, webhooks/stripe)
├── staff/               Staff dashboard (role-gated)
└── stripe-redirect/     Post-payment redirect handler
components/              React components (CartDrawer, MenuCard, FishSoupConfigModal, etc.)
store/                   Zustand stores: auth.store.ts, cart.store.ts, orders.store.ts
lib/
├── config.ts            All tuneable constants — single source of truth
├── supabase.ts          Supabase client + all DB query functions
├── fishSoup.ts          Fish soup configuration logic
├── time.ts              SGT time, category availability, parent timing inheritance
└── seed.ts              Database seeding script
```

## Key Files

- **`lib/config.ts`** — every constant, polling interval, table name, and status config
- **`lib/supabase.ts`** — all Supabase queries and API call wrappers
- **`supabase-schema.sql`** — authoritative DB schema (tables, indexes, triggers, RPCs)
- **`type.d.ts`** — all TypeScript type definitions
- **`.env.local.example`** — environment variable template
