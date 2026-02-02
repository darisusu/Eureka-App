# Collections in Appwrite
## user
- name (string)
- email (string)
- accountId (string)
- avatar (url)
- document id: use Appwrite account.$id for a 1:1 mapping (profile doc fetched by id) (innate appwrite id)

## orders
- total (double)
- userId (string) -> refers to user.$id
- orderNumber(string)
- status (enum: "pending_payment", "paid", "received", "preparing", "ready", "collected")
  - pending_payment: created by checkout before payment
  - paid: payment confirmed, ready for kitchen flow
- isPaid (boolean)
- promoId (string, optional) -> refers to promo_codes.$id
- promoCode (string, optional) -> promo code used (uppercase)
- discountCents (integer) (int, optional)
- paymentIntentId (string, optional) -> Stripe PaymentIntent id

- has its own new unique $id


## orders_items
- name (string)
- price (double)
- specialRequest (string, optional)
- orderId (string) ->refers to orders.$id
- menuId (string)
- qty (integer)

- has its own new unique $id


## menu

## categories

## promo_codes
- codeUpper (string, store uppercase, unique)
- isActive (boolean)
- type (enum: "PERCENT" or "FIXED")
- value (number) depends on type
  - percent: e.g. 10 means 10%
  - fixed: store cents (e.g. 300 = $3.00)
- maxDiscountCents (integer, optional, useful for percent promos)
- minSubtotalCents -> to allow for the discount to be used
- usageLimitPerUser -> set to 1


## promo_redemptions
- promoId -> refers to promo_codes.$id
- userId -> refers to user.$id
- redeemedAt (datetime)
- discountCents (int) (optional)
- orderId (string) -> refers to orders.$id


# Functions
## calculate-cart
Environment variables:
- APPWRITE_ENDPOINT
- APPWRITE_PROJECT_ID
- APPWRITE_API_KEY
- APPWRITE_DATABASE_ID
- APPWRITE_MENU_COLLECTION_ID
- APPWRITE_PROMO_CODES_COLLECTION_ID
- APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID

## create-checkout/ (order + PaymentIntent)
Environment variables:
- APPWRITE_ENDPOINT
- APPWRITE_PROJECT_ID
- APPWRITE_API_KEY
- APPWRITE_DATABASE_ID
- APPWRITE_MENU_COLLECTION_ID
- APPWRITE_ORDERS_COLLECTION_ID
- APPWRITE_ORDER_ITEMS_COLLECTION_ID
- APPWRITE_PROMO_CODES_COLLECTION_ID
- APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID
- STRIPE_SECRET_KEY
- STRIPE_CURRENCY (optional, defaults to sgd)
- STRIPE_API_VERSION (optional, defaults to 2023-10-16)

Request payloads:
- Create:
  - action: "create"
  - userId (string)
  - promoCode (string, optional)
  - customerEmail (string, optional)
  - items: [{ menuId, quantity, specialRequest? }]
- Confirm:
  - action: "confirm"
  - userId (string)
  - orderId (string)
  - paymentIntentId (string)
  - Confirms the PaymentIntent with Stripe and updates order to paid.

Response data:
- orderId, orderNumber
- paymentRequired (boolean)
- paymentIntentId, clientSecret (null when paymentRequired is false)
- subtotalCents, discountCents, totalCents
- promo (nullable)
- If totalCents is 0, paymentRequired is false and the order is marked paid.

Client config:
- EXPO_PUBLIC_APPWRITE_CREATE_CHECKOUT_FUNCTION_ID
- EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY

## stripe-webhook/ (webhook)
