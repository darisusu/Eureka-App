# user
- name (string)
- email (string)
- accountId (string)
- avatar (url)

# orders
- total (double)
- userId (string) -> refers to user.$id
- orderNumber(string)
- status (enum: "received", "preparing", "ready") note: collected is removed
- isPaid (boolean)
- promoId (string, optional) -> refers to promo_codes.$id
- promoCode (string, optional) -> promo code used (uppercase)
- discountCents (int, optional)

- has its own new unique $id


# orders_items
- name (string)
- price (double)
- specialRequest (string, optional)
- orderId (string) ->refers to orders.$id
- menuId (string)
- qty (integer)

- has its own new unique $id


# menu

# categories

# promo_codes
- codeUpper (string, store uppercase, unique)
- isActive (boolean)
- type (enum: "PERCENT" or "FIXED")
- value (number) depends on type
  - percent: e.g. 10 means 10%
  - fixed: store cents (e.g. 300 = $3.00)
- maxDiscountCents (integer, optional, useful for percent promos)
- minSubtotalCents -> to allow for the discount to be used
- usageLimitPerUser -> set to 1


# promo_redemptions
- promoId -> refers to promo_codes.$id
- userId -> refers to user.$id
- redeemedAt (datetime)
- discountCents (int) (optional)
- orderId (string) -> refers to orders.$id


