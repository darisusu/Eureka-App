# calculate-cart (Appwrite Function)

## Purpose
Server-side pricing for the cart. Uses menu prices from Appwrite to prevent client tampering, validates promo codes, and returns subtotal/discount/total in cents.

## Related files
- `functions/calculate-cart/index.js` (function implementation)
- `lib/appwrite.ts` (`calculateCartTotals` client wrapper)
- `app/(tabs)/cart.tsx` (`refreshTotals` + promo apply flow)
- `docs/appwrite.md` (collections + env overview)

## Flow (client -> server -> client)
1) `app/(tabs)/cart.tsx` calls `calculateCartTotals` when the cart changes or when a promo is applied.
2) `lib/appwrite.ts` builds the payload and calls the Appwrite function via `functions.createExecution` using `appwriteConfig.calculateOrderFunctionId`.
3) `functions/calculate-cart/index.js` loads authoritative menu prices, recomputes subtotal, validates promo rules, and returns totals.

## Request payload
Shape sent by `lib/appwrite.ts`:
```json
{
  "userId": "user_document_id",
  "promoCode": "SAVE10",
  "items": [
    { "menuId": "menu_doc_id", "quantity": 2 },
    { "menuId": "menu_doc_id_2", "quantity": 1 }
  ]
}
```
Notes:
- `userId` is optional unless a promo is supplied.
- `items` is required; an empty array returns zero totals without error.

## Response payload
Success:
```json
{
  "ok": true,
  "data": {
    "subtotalCents": 1200,
    "discountCents": 200,
    "totalCents": 1000,
    "promo": { "promoId": "promo_doc_id", "codeUpper": "SAVE10", "discountCents": 200 }
  }
}
```
Failure:
```json
{ "ok": false, "message": "Promo code not found." }
```

## Pricing + validation rules
- Menu prices come from the `menu` collection; client prices are ignored.
- Quantities <= 0 are skipped.
- Missing menu IDs or invalid menu prices return an error.
- Promo code rules:
  - Requires `userId`.
  - Must exist and be active.
  - Must meet `minSubtotalCents` if set.
  - Enforces `usageLimitPerUser` by checking `promo_redemptions`.
  - `PERCENT` is a percentage of subtotal; `FIXED` is cents.
  - Discount is capped by `maxDiscountCents` and never exceeds the subtotal.
  - If discount <= 0, the promo is rejected.

## Environment variables (function)
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_MENU_COLLECTION_ID`
- `APPWRITE_PROMO_CODES_COLLECTION_ID`
- `APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID`

## Configuration (client)
- `appwriteConfig.calculateOrderFunctionId` in `lib/appwrite.ts` controls which function is called.
- If you redeploy the function, update this ID accordingly.
