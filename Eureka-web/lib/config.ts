import type { OrderStatus } from "@/type";

// ── Customer UX ───────────────────────────────────────────────────────────────

/** Maximum number of past orders stored in localStorage and shown on the profile page. */
export const RECENT_ORDERS_LIMIT = 5;

/**
 * Milliseconds to wait on /stripe-redirect before navigating to the order detail page.
 * Gives the user time to read the "Payment confirmed!" message.
 */
export const POST_PAYMENT_REDIRECT_DELAY_MS = 1_500;

// ── Order Number Formatting ───────────────────────────────────────────────────

/**
 * Display width of order numbers, zero-padded (e.g. "00042").
 * Must match the sequence tracked by the daily_order_counter table in Supabase.
 */
export const ORDER_NUMBER_PAD_LENGTH = 5;

// ── Staff Dashboard Polling ───────────────────────────────────────────────────

/** How often (ms) the staff dashboard re-fetches active orders (Received / Preparing / Ready). */
export const STAFF_ACTIVE_ORDERS_POLL_MS = 10_000;

/** How often (ms) the staff dashboard re-fetches collected order history. */
export const STAFF_HISTORY_POLL_MS = 15_000;

// ── Staff Dashboard Query Limits ──────────────────────────────────────────────

/** Maximum active orders fetched per staff dashboard poll. */
export const STAFF_ACTIVE_ORDERS_LIMIT = 100;

/** Maximum collected orders fetched for the staff history tab. */
export const STAFF_HISTORY_ORDERS_LIMIT = 200;

// ── Business Logic Defaults ───────────────────────────────────────────────────

/**
 * Fallback max-wait minutes used when a dept_config row exists but max_wait_minutes is NULL.
 * The canonical per-category values live in the Supabase dept_config table:
 *   Supabase → Table Editor → dept_config → max_wait_minutes
 */
export const DEFAULT_DEPT_MAX_WAIT_MINUTES = 45;

// ── Order Status ──────────────────────────────────────────────────────────────

/** All valid order status strings; used for server-side validation in /api/update-order-status. */
export const VALID_ORDER_STATUSES = [
    "pending_payment",
    "paid",
    "received",
    "preparing",
    "ready",
    "collected",
    "cancelled",
] as const;

/**
 * Statuses for which the "Ready by HH:MM" banner is shown on the order detail page.
 * Update here if the order status flow changes.
 */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["received", "preparing", "ready"];

/**
 * Central display config for each order status — label, text colour, background colour.
 * Used by the order detail page, profile recent-orders list, and any other UI
 * that maps a status to human-readable text or Tailwind classes.
 */
export const STATUS_CONFIG: Record<OrderStatus, { label: string; textColor: string; bgColor: string }> = {
    received:        { label: "Confirmed",        textColor: "text-primary",  bgColor: "bg-primary/10"  },
    preparing:       { label: "Preparing",        textColor: "text-primary",  bgColor: "bg-primary/20"  },
    ready:           { label: "Ready to Collect", textColor: "text-success",  bgColor: "bg-success/10"  },
    collected:       { label: "Collected",        textColor: "text-gray-100", bgColor: "bg-dark-100/5"  },
    cancelled:       { label: "Cancelled",        textColor: "text-error",    bgColor: "bg-error/10"    },
    pending_payment: { label: "Pending",          textColor: "text-gray-100", bgColor: "bg-dark-100/5"  },
    paid:            { label: "Paid",             textColor: "text-gray-100", bgColor: "bg-dark-100/5"  },
};

// ── Supabase Table & RPC Names ────────────────────────────────────────────────
// These mirror the table/function names defined in supabase-schema.sql.
// If you rename a table or RPC in Supabase, update these constants AND the schema file.

export const TABLE_USERS             = "users";
export const TABLE_MENU              = "menu";
export const TABLE_CATEGORIES        = "categories";
export const TABLE_ORDERS            = "orders";
export const TABLE_ORDER_ITEMS       = "order_items";
export const TABLE_ORDER_DEPT_SLOTS  = "order_dept_slots";
export const TABLE_PROMO_CODES       = "promo_codes";
export const TABLE_PROMO_REDEMPTIONS = "promo_redemptions";
export const TABLE_DEPT_CONFIG       = "dept_config";

/** Postgres function called via supabase.rpc() to compute the next available slot for a dept. */
export const RPC_CALCULATE_DEPT_READY_AT = "calculate_dept_ready_at";

// ── Supabase DB-only Settings (not controllable from this codebase) ───────────
// The following are configured directly in Supabase. Documented here for reference.
//
// dept_config table (Supabase → Table Editor → dept_config):
//   base_prep_minutes — base preparation time for the first order in a slot window
//   gap_minutes       — minimum gap between consecutive order ready-at times
//   max_wait_minutes  — per-category hard ceiling; NULL falls back to DEFAULT_DEPT_MAX_WAIT_MINUTES
//
// daily_order_counter table:
//   Resets at 04:00 SGT each day (= UTC 20:00 previous calendar day).
//   Business day is SGT − 4 h, so orders placed 00:00–03:59 SGT belong to
//   the previous calendar date. Controlled by DB trigger trg_daily_order_number.
//
// orders.updated_at:
//   Auto-updated by trigger trg_orders_updated_at on every row UPDATE.
//   If the column is missing from an existing DB, run:
//     ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
//
// Row Level Security (RLS):
//   Customer-facing Supabase client calls use the anon key and are subject to RLS.
//   API routes use SUPABASE_SECRET_KEY (service role key) to bypass RLS.
