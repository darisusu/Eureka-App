# create-checkout (Appwrite Function)

## Purpose
Creates an order in Appwrite, generates a Stripe PaymentIntent, and returns a client secret for PaymentSheet. A second "confirm" action verifies payment with Stripe and marks the order paid.

## Related files
- `functions/create-checkout/index.js` (function implementation)
- `lib/appwrite.ts` (`createCheckout`, `confirmCheckoutPayment` client wrappers)
- `app/(tabs)/cart.tsx` (`handleOrderNow` + PaymentSheet flow)
- `app/_layout.tsx` (StripeProvider setup)
- `type.d.ts` (`CheckoutResponse`, `CheckoutConfirmResponse`)
- `docs/appwrite.md` (collections + env overview)

## Flow (client)
1) User taps Order Now in `app/(tabs)/cart.tsx`.
2) `createCheckout` is called with cart items and optional promo code.
3) If `paymentRequired` is false, the order is already paid; the cart is cleared.
4) If `paymentRequired` is true, the client initializes and presents Stripe PaymentSheet using `clientSecret`.
5) After a successful sheet, `confirmCheckoutPayment` verifies the PaymentIntent on the server and marks the order paid.

## Actions
### action: "create"
Request payload:
```json
{
  "action": "create",
  "userId": "user_document_id",
  "promoCode": "SAVE10",
  "customerEmail": "user@example.com",
  "items": [
    { "menuId": "menu_doc_id", "quantity": 2, "specialRequest": "extra spicy" }
  ]
}
```
Response payload:
```json
{
  "ok": true,
  "data": {
    "orderId": "order_doc_id",
    "orderNumber": "E123456",
    "paymentRequired": true,
    "paymentIntentId": "pi_...",
    "clientSecret": "pi_..._secret_...",
    "subtotalCents": 1200,
    "discountCents": 200,
    "totalCents": 1000,
    "promo": { "promoId": "promo_doc_id", "codeUpper": "SAVE10", "discountCents": 200 }
  }
}
```
Notes:
- If `totalCents` is 0, the function skips Stripe, sets `paymentRequired` to false, and marks the order paid immediately.
- `specialRequest` is trimmed and stored only if non-empty.

### action: "confirm"
Request payload:
```json
{
  "action": "confirm",
  "userId": "user_document_id",
  "orderId": "order_doc_id",
  "paymentIntentId": "pi_..."
}
```
Response payload:
```json
{
  "ok": true,
  "data": { "orderId": "order_doc_id", "status": "paid", "isPaid": true }
}
```
Notes:
- The server retrieves the PaymentIntent from Stripe and requires `status === "succeeded"`.
- If the order is already paid, it returns success without re-updating.

## Server-side logic summary
- Recomputes pricing from `menu` collection (client prices are ignored).
- Validates promo codes using the same rules as `calculate-cart`.
- Creates `orders` and `orders_items` in Appwrite.
- Creates a Stripe PaymentIntent with automatic_payment_methods and receipt_email.
- Sets order fields:
  - Create: `status: "pending_payment"`, `isPaid: false`, `paymentIntentId` stored
  - Free order: `status: "paid"`, `isPaid: true`
  - Confirm: `status: "paid"`, `isPaid: true`
- Creates `promo_redemptions` when the order is paid.
- If order creation fails after PaymentIntent creation, the PaymentIntent is canceled.

## Environment variables (function)
Required:
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_MENU_COLLECTION_ID`
- `APPWRITE_ORDERS_COLLECTION_ID`
- `APPWRITE_ORDER_ITEMS_COLLECTION_ID`
- `APPWRITE_PROMO_CODES_COLLECTION_ID`
- `APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID`
- `STRIPE_SECRET_KEY`

Optional:
- `STRIPE_CURRENCY` (defaults to `sgd`)
- `STRIPE_API_VERSION` (defaults to `2023-10-16`)

## Configuration (client)
- `appwriteConfig.createCheckoutFunctionId` in `lib/appwrite.ts` controls which function is called.
- `StripeProvider` is initialized in `app/_layout.tsx` using `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- `initPaymentSheet` enables Apple Pay + Google Pay with `merchantCountryCode: "SG"` in `app/(tabs)/cart.tsx`.
- If you redeploy the function, update the function ID in `lib/appwrite.ts`.

## Known constraints
- The create action is not idempotent; multiple calls create multiple orders/PaymentIntents.
- Payment status is only marked paid after the confirm action (or free orders).
