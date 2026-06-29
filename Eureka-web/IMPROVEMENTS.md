# Eureka-web — Improvement Plan

Prioritised list of improvements identified during a full codebase audit (June 2026). Items are grouped by urgency and ordered by impact within each tier.

---

## P0 — Security (address before scaling)

### 1. Add authorization to `/api/update-order-status`

**Problem:** The endpoint accepts any `orderId` and `status` with no caller identity check. Any client that can POST to this route can move any order to any status — including marking someone else's order as collected.

**How it works today:**
```
POST /api/update-order-status  { orderId, status }
→ validates status ∈ VALID_ORDER_STATUSES
→ UPDATE orders SET status = ? WHERE id = ?
→ done — no user or role check
```

**Fix:** Require the caller's phone number in the request body. Look up the user in the `users` table and verify `role === "staff"` before allowing the update.

```ts
// In app/api/update-order-status/route.ts, after parsing orderId + status:
const phone = typeof body.phone === "string" ? body.phone.trim() : "";
if (!phone) return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });

const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("phone", phone)
    .maybeSingle();

if (caller?.role !== "staff") {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
}
```

Also update the client-side `updateOrderStatus()` in `lib/supabase.ts` to include `phone` from the auth store.

**Files:** `app/api/update-order-status/route.ts`, `lib/supabase.ts`

---

### 2. Validate `userId` server-side in `/api/create-checkout`

**Problem:** The `userId` is sent in the request body and trusted as-is. Since auth is phone-only with no signed session, a malicious client could send any user's ID and place orders or redeem promos on their behalf.

**How it works today:**
```
POST /api/create-checkout  { action: "create", userId, items, promoCode }
→ userId is used directly to create order and redeem promos
→ no verification that the caller is actually that user
```

**Fix (short-term):** Require `phone` in the request body. Look up the user by phone and verify the returned `id` matches the provided `userId`. This doesn't prevent a caller who knows both phone + ID, but it adds a verification layer.

```ts
const { data: verifiedUser } = await supabase
    .from("users")
    .select("id")
    .eq("phone", body.phone)
    .maybeSingle();

if (!verifiedUser || verifiedUser.id !== userId) {
    return NextResponse.json({ ok: false, message: "User verification failed." }, { status: 403 });
}
```

**Fix (medium-term):** Migrate to Supabase Auth so each request carries a signed JWT. Extract the user ID from the token instead of the request body. This eliminates the impersonation vector entirely.

**Files:** `app/api/create-checkout/route.ts`, `app/api/calculate-cart/route.ts`

---

### 3. Validate quantity ranges in API routes

**Problem:** Neither `/api/calculate-cart` nor `/api/create-checkout` validates that `quantity` is a positive integer. A crafted request with `quantity: -1` or `quantity: 0` would produce a negative or zero subtotal, potentially allowing free orders or promo code abuse.

**Fix:** Add range validation immediately after parsing items in both routes:

```ts
for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json(
            { ok: false, message: "Each item quantity must be a positive integer." },
            { status: 400 }
        );
    }
}
```

**Files:** `app/api/calculate-cart/route.ts`, `app/api/create-checkout/route.ts`

---

## P1 — Reliability

### 4. Log `populateDeptSlots` failures instead of swallowing them

**Problem:** In `create-checkout/route.ts`, the call to `populateDeptSlots()` is wrapped in `.catch(() => null)`. If the dept slot calculation fails (RPC error, DB timeout, etc.), the order is created successfully but `readyAt` is `undefined`. The customer sees no ETA and there's no log trail to diagnose why.

**Fix:** Replace the silent catch with proper error logging and include a warning flag in the response so the client can display "ETA unavailable" rather than a stale default.

```ts
// Before:
await populateDeptSlots(supabase, orderId, categoryIds).catch(() => null);

// After:
const readyAt = await populateDeptSlots(supabase, orderId, categoryIds)
    .catch((err) => {
        console.error("[create-checkout] populateDeptSlots failed:", err);
        return null;
    });
```

**File:** `app/api/create-checkout/route.ts`

---

### 5. Add webhook idempotency to `/api/webhooks/stripe`

**Problem:** Stripe can deliver the same webhook event multiple times (retries on timeout, network issues). The current handler processes every event without checking if it was already handled. While the `UNIQUE(promo_id, user_id)` constraint prevents double promo redemption, the order status could be set to `received` again after it has already moved to `ready` or `collected`.

**Fix:** Before updating the order, check its current status. If the order is already past `received` (i.e. `ready`, `collected`, or `cancelled`), skip the update:

```ts
const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("payment_intent_id", pi.id)
    .maybeSingle();

if (!order) return NextResponse.json({ received: true }); // already logged

// Only update if still in pending_payment state
if (order.status !== "pending_payment") {
    return NextResponse.json({ received: true });
}
```

**File:** `app/api/webhooks/stripe/route.ts`

---

### 6. Extract shared promo validation logic

**Problem:** Promo code validation (lookup, activity check, usage check, discount calculation) is duplicated between `/api/calculate-cart` and `/api/create-checkout`. Any bug fix or rule change must be applied in both places, and they can drift silently.

**Fix:** Extract the shared logic into a `lib/promo.ts` server-side helper:

```ts
// lib/promo.ts
export async function validateAndCalculatePromo(
    supabase: SupabaseClient,
    codeUpper: string,
    userId: string,
    subtotalCents: number
): Promise<{ promoId: string; discountCents: number } | { error: string }> {
    // 1. Look up promo by code_upper
    // 2. Check is_active
    // 3. Check min_subtotal_cents
    // 4. Check usage limit via promo_redemptions count
    // 5. Calculate discount (PERCENT or FIXED, capped by max_discount_cents)
    // 6. Return result or error string
}
```

Both routes then call `validateAndCalculatePromo()` and handle the result identically.

**Files:** New `lib/promo.ts`, `app/api/calculate-cart/route.ts`, `app/api/create-checkout/route.ts`

---

## P2 — Code Quality

### 7. Type the Supabase order relation casts

**Problem:** `getActiveOrders()` and `getCollectedOrders()` in `lib/supabase.ts` use verbose inline `as` casts to access nested relation fields (`order.users`, `order.order_items`, `order.updated_at`). These casts are repeated identically across both functions and are brittle — they silently mask type mismatches.

**Fix:** Define a `SupabaseOrderRow` interface that matches the shape of the Supabase `.select()` response, then cast once at the top of each function:

```ts
interface SupabaseOrderRow {
    id: string;
    status: string;
    order_number: number;
    created_at: string;
    updated_at?: string;
    ready_at?: string | null;
    users: { name?: string; phone?: string } | null;
    order_items: { name: string; qty: number; special_request?: string }[];
}

// Then in each function:
const typedOrders = orders as SupabaseOrderRow[];
return typedOrders.map(order => ({ ... }));
```

**File:** `lib/supabase.ts`

---

### 8. Type `populateDeptSlots` parameter

**Problem:** `create-checkout/route.ts` declares `populateDeptSlots(supabaseClient: any, ...)`. The `any` type defeats TypeScript's ability to catch misuse.

**Fix:**
```ts
import type { SupabaseClient } from "@supabase/supabase-js";

async function populateDeptSlots(
    supabaseClient: SupabaseClient,
    orderId: string,
    categoryIds: string[]
) { ... }
```

**File:** `app/api/create-checkout/route.ts`

---

### 9. Fix phone normalization inconsistency

**Problem:** In `store/auth.store.ts`, `normalizePhone()` strips spaces but the validation regex (`/^\+?[\d\s\-()]{7,20}$/`) allows dashes and parentheses. Input like `123-456-7890` passes validation but `normalizePhone` only removes spaces, leaving dashes in the stored phone number.

**Fix:** Update `normalizePhone` to strip all non-digit characters except the leading `+`:

```ts
const normalizePhone = (phone: string): string => {
    const trimmed = phone.trim();
    const hasPlus = trimmed.startsWith("+");
    const digits = trimmed.replace(/\D/g, "");
    return hasPlus ? `+${digits}` : digits;
};
```

**File:** `store/auth.store.ts`

---

## P3 — UX & Observability

### 10. Add structured logging

**Problem:** All server-side logging uses `console.log`/`console.error`. In production, these are unstructured, have no severity levels, and aren't connected to an alerting system. A payment failure or webhook error produces a log line that nobody sees unless they're watching the Vercel function logs.

**Options (pick one):**
- **Sentry** — error tracking with stack traces, release tracking, and Slack alerts. Free tier covers small traffic. Add `@sentry/nextjs`, wrap API routes with `Sentry.withScope()`.
- **Vercel Log Drain** — pipe function logs to Datadog, Axiom, or Betterstack for structured search and alerting. No code changes needed beyond the Vercel dashboard config.
- **Axiom** — lightweight structured logging. Drop-in `@axiomhq/nextjs` package, auto-instruments API routes.

**Minimum viable step:** Replace bare `console.error` calls in API routes with a thin wrapper that includes the route name, timestamp, and request metadata (order ID, user ID if available). Even without a third-party service, this makes Vercel's log viewer more useful.

---

### 11. Add client-side caching for categories and menu

**Problem:** `getCategories()` and `getMenu()` hit Supabase on every page mount of `/search`. The category list rarely changes, so the repeated fetches add latency and Supabase usage for no benefit.

**Options:**
- **SWR** (`swr` package) — lightweight, stale-while-revalidate. Cache categories with a long `dedupingInterval` (e.g. 60s).
- **React Query / TanStack Query** — more features (background refetch, cache invalidation). Heavier dependency but standard for this pattern.
- **Next.js `fetch` caching** — move data fetching to a Server Component with `revalidate: 60`. No client-side state needed.

**Simplest approach using SWR:**
```ts
import useSWR from "swr";

const { data: categories } = useSWR("categories", getCategories, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
});
```

**Files:** `app/(tabs)/search/page.tsx`, new or existing data-fetching hooks
