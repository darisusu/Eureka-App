const fs = require("fs");
const path = require("path");

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(path.join(process.cwd(), ".env"));

const getEnv = (key, fallbackKey) => {
  if (process.env[key]) return process.env[key];
  if (fallbackKey && process.env[fallbackKey]) return process.env[fallbackKey];
  const value = process.env[key];
  if (!value) {
    const fallbackLabel = fallbackKey ? ` or ${fallbackKey}` : "";
    throw new Error(`Missing env var: ${key}${fallbackLabel}`);
  }
  return value;
};

const config = {
  endpoint: getEnv("APPWRITE_ENDPOINT", "EXPO_PUBLIC_APPWRITE_ENDPOINT").replace(
    /\/$/,
    ""
  ),
  projectId: getEnv("APPWRITE_PROJECT_ID", "EXPO_PUBLIC_APPWRITE_PROJECT_ID"),
  apiKey: getEnv("APPWRITE_API_KEY"),
  databaseId: getEnv("APPWRITE_DATABASE_ID"),
  userCollectionId: process.env.APPWRITE_USER_COLLECTION_ID || "user",
  ordersCollectionId: process.env.APPWRITE_ORDERS_COLLECTION_ID || "orders",
  promoRedemptionsCollectionId:
    process.env.APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID || "promo_redemptions",
};

const headers = {
  "X-Appwrite-Project": config.projectId,
  "X-Appwrite-Key": config.apiKey,
  "Content-Type": "application/json",
};

// Helper to build URL with query parameters
const buildUrl = (path, params) => {
  const url = new URL(`${config.endpoint}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, item));
      } else if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
};

// Helper to list documents in a collection with optional queries, limit, and offset
const listDocuments = async ({
  collectionId,
  queries = [],
  limit = 100,
  offset = 0,
}) => {
  const url = buildUrl(
    `/v1/databases/${config.databaseId}/collections/${collectionId}/documents`,
    { queries, limit, offset }
  );
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`List documents failed: ${res.status} ${body}`);
  }
  return res.json();
};

// Helper to list all documents in a collection, handling pagination
const listAllDocuments = async ({ collectionId, queries = [] }) => {
  const all = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await listDocuments({ collectionId, queries, limit, offset });
    all.push(...page.documents);
    if (all.length >= page.total || page.documents.length === 0) {
      break;
    }
    offset += page.documents.length;
  }

  return all;
};

module.exports = {
  config,
  listDocuments,
  listAllDocuments,
};
