# Appwrite Test Scripts

These scripts run against your Appwrite project using the REST API.

## Setup

Set these env vars (usually in `.env` or `.env.local`):

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`

Optional overrides:

- `APPWRITE_USER_COLLECTION_ID` (default: `user`)
- `APPWRITE_ORDERS_COLLECTION_ID` (default: `orders`)
- `APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID` (default: `promo_redemptions`)

## Scripts

### 1) Check for duplicate users

Detects multiple user docs with the same `accountId` and mismatched `$id`.

```bash
node tests/check-duplicate-users.js
```

### 2) Check for orphan orders

Finds orders whose `userId` does not exist in the `user` collection.

```bash
node tests/check-orphan-orders.js
```

### 3) Check for duplicate promo redemptions

Detects multiple redemptions for the same `userId + promoId`.

```bash
node tests/check-promo-redemptions.js
```

## Running from the project root

The scripts load `.env` and `.env.local` from the current working directory.
Run them from the project root so the env file is found:

```bash
pwd # should be .../Eureka
node tests/check-duplicate-users.js
```

## Notes

- These scripts read from production data; they do not write or mutate records.
- If you use multiple environments, ensure your env vars point at the right Appwrite project.
- You can also set `EXPO_PUBLIC_APPWRITE_ENDPOINT` and `EXPO_PUBLIC_APPWRITE_PROJECT_ID`.
- The scripts auto-load `.env.local` from the project root.

Example `.env.local` entries:

```bash
APPWRITE_ENDPOINT=https://your-appwrite-host/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=your_database_id
```
