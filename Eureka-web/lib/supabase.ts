import { createClient } from "@supabase/supabase-js";
import type {
    CartItemType,
    CartTotalsResponse,
    CheckoutConfirmResponse,
    CheckoutResponse,
    CreateUserParams,
    GetMenuParams,
    OrderDetail,
    OrderHistoryEntry,
    PromoCode,
    StaffOrder,
    OrderStatus,
    User,
} from "@/type";
import {
    DEFAULT_DEPT_MAX_WAIT_MINUTES,
    ORDER_NUMBER_PAD_LENGTH,
    RECENT_ORDERS_LIMIT,
    RPC_CALCULATE_DEPT_READY_AT,
    SET_MEAL_UPGRADE_DRINKS_CATEGORY_NAME,
    SET_MEAL_UPGRADE_ITEM_NAME,
    STAFF_ACTIVE_ORDERS_LIMIT,
    STAFF_HISTORY_ORDERS_LIMIT,
    TABLE_CATEGORIES,
    TABLE_DEPT_CONFIG,
    TABLE_MENU,
    TABLE_ORDER_DEPT_SLOTS,
    TABLE_ORDER_ITEMS,
    TABLE_ORDERS,
    TABLE_PROMO_CODES,
    TABLE_PROMO_REDEMPTIONS,
    TABLE_USERS,
} from "@/lib/config";

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const formatDisplayName = (name: string) =>
    name.trim().split(/\s+/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ");

export const getUserByPhone = async (phone: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from(TABLE_USERS)
        .select("id, name, phone, role")
        .eq("phone", phone.trim())
        .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, name: data.name, phone: data.phone, role: data.role as "staff" | "customer" };
};

export const createUser = async ({ name, phone }: CreateUserParams): Promise<User> => {
    const formattedName = formatDisplayName(name);
    const { data, error } = await supabase
        .from(TABLE_USERS)
        .insert({ name: formattedName, phone: phone.trim(), role: "customer" })
        .select("id, name, phone, role")
        .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to create user.");
    return { id: data.id, name: data.name, phone: data.phone, role: data.role as "staff" | "customer" };
};

export const getMenu = async ({ category, query }: GetMenuParams) => {
    let q = supabase
        .from(TABLE_MENU)
        .select("id, name, description, image_url, price, category_id, is_available")
        .eq("is_available", true);
    if (category) q = q.eq("category_id", category);
    if (query) q = q.ilike("name", `%${query}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
};

export const getCategories = async () => {
    const { data, error } = await supabase
        .from(TABLE_CATEGORIES)
        .select("id, name, description, has_queue, available_from, available_until")
        .order("sort_order")
        .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
};

export const calculateCartTotals = async ({
    userId,
    items,
    promoCode,
}: {
    userId?: string;
    items: CartItemType[];
    promoCode?: string | null;
}): Promise<CartTotalsResponse> => {
    const res = await fetch("/api/calculate-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId,
            promoCode,
            items: items.map(i => ({ menuId: i.id, quantity: i.quantity })),
        }),
    });
    const result = await res.json();
    if (!result.ok || !result.data) throw new Error(result.message ?? "Failed to calculate cart totals.");
    return result.data;
};

export const createCheckout = async ({
    userId,
    items,
    promoCode,
}: {
    userId: string;
    items: CartItemType[];
    promoCode?: string | null;
}): Promise<CheckoutResponse> => {
    const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "create",
            userId,
            promoCode,
            items: items.map(i => ({
                menuId: i.id,
                quantity: i.quantity,
                specialRequest: i.specialRequest,
            })),
        }),
    });
    const result = await res.json();
    if (!result.ok || !result.data) throw new Error(result.message ?? "Failed to create checkout.");
    return result.data;
};

export const confirmCheckoutPayment = async ({
    userId,
    orderId,
    paymentIntentId,
}: {
    userId: string;
    orderId: string;
    paymentIntentId: string;
}): Promise<CheckoutConfirmResponse> => {
    const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", userId, orderId, paymentIntentId }),
    });
    const result = await res.json();
    if (!result.ok || !result.data) throw new Error(result.message ?? "Failed to confirm payment.");
    return result.data;
};

export const getRecentOrders = async ({
    userId,
    limit = RECENT_ORDERS_LIMIT,
}: {
    userId: string;
    limit?: number;
}): Promise<OrderHistoryEntry[]> => {
    if (!userId) return [];

    const { data: orders, error } = await supabase
        .from(TABLE_ORDERS)
        .select("id, status, total, order_number, created_at")
        .eq("user_id", userId)
        .eq("is_paid", true)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error || !orders?.length) return [];

    const orderIds = orders.map(o => o.id);
    const { data: items } = await supabase
        .from(TABLE_ORDER_ITEMS)
        .select("order_id, name, qty")
        .in("order_id", orderIds);

    const itemsByOrder = new Map<string, { name: string; qty: number }[]>();
    for (const item of items ?? []) {
        const existing = itemsByOrder.get(item.order_id) ?? [];
        existing.push(item);
        itemsByOrder.set(item.order_id, existing);
    }

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-SG", { month: "short", day: "numeric", year: "numeric" });

    return orders.map(order => {
        const orderItems = itemsByOrder.get(order.id) ?? [];
        return {
            orderId: order.id,
            orderNumber: "G" + String(order.order_number).padStart(ORDER_NUMBER_PAD_LENGTH, "0"),
            dateLabel: formatDate(order.created_at),
            total: Number(order.total),
            status: order.status as OrderStatus,
            itemsSummary: orderItems.length
                ? orderItems.map(i => `${i.qty}x ${i.name}`).join(", ")
                : "Items unavailable",
        };
    });
};

export const getOrderStatus = async (orderId: string): Promise<OrderStatus | null> => {
    const { data, error } = await supabase
        .from(TABLE_ORDERS)
        .select("status")
        .eq("id", orderId)
        .single();
    if (error || !data) return null;
    return data.status as OrderStatus;
};

export const getOrderDetail = async (orderId: string): Promise<OrderDetail | null> => {
    const { data: order, error } = await supabase
        .from(TABLE_ORDERS)
        .select("id, status, total, order_number, created_at, ready_at, promo_code, discount_cents")
        .eq("id", orderId)
        .single();

    if (error || !order) return null;

    const { data: items } = await supabase
        .from(TABLE_ORDER_ITEMS)
        .select("name, qty, price, special_request")
        .eq("order_id", orderId);

    const date = new Date(order.created_at);

    return {
        orderId: order.id,
        orderNumber: "G" + String(order.order_number).padStart(ORDER_NUMBER_PAD_LENGTH, "0"),
        status: order.status as OrderStatus,
        total: Number(order.total),
        discountCents: order.discount_cents ?? 0,
        promoCode: order.promo_code ?? undefined,
        dateLabel: date.toLocaleDateString("en-SG", { month: "short", day: "numeric", year: "numeric" }),
        timeLabel: date.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" }),
        readyAt: order.ready_at ?? undefined,
        items: (items ?? []).map(i => ({
            name: i.name,
            qty: i.qty,
            price: Number(i.price),
            specialRequest: i.special_request ?? undefined,
        })),
    };
};

export const getActiveOrders = async (): Promise<StaffOrder[]> => {
    const { data: orders, error } = await supabase
        .from(TABLE_ORDERS)
        .select("id, status, order_number, created_at, updated_at, users(name), order_items(id, name, qty, special_request)")
        .eq("is_paid", true)
        .in("status", ["received", "preparing", "ready"])
        .order("created_at", { ascending: false })
        .limit(STAFF_ACTIVE_ORDERS_LIMIT);

    if (error || !orders) return [];

    return orders.map(order => ({
        orderId: order.id,
        orderNumber: "G" + String(order.order_number).padStart(ORDER_NUMBER_PAD_LENGTH, "0"),
        status: order.status as OrderStatus,
        createdAt: order.created_at,
        updatedAt: (order as { updated_at?: string }).updated_at ?? order.created_at,
        userName: (order.users as { name?: string } | null)?.name ?? "—",
        items: ((order.order_items as { name: string; qty: number; special_request?: string }[]) ?? []).map(i => ({
            name: i.name,
            qty: i.qty,
            specialRequest: i.special_request,
        })),
    }));
};

export const getCollectedOrders = async (): Promise<StaffOrder[]> => {
    const { data: orders, error } = await supabase
        .from(TABLE_ORDERS)
        .select("id, status, order_number, created_at, updated_at, users(name), order_items(id, name, qty, special_request)")
        .eq("is_paid", true)
        .eq("status", "collected")
        .order("created_at", { ascending: false })
        .limit(STAFF_HISTORY_ORDERS_LIMIT);

    if (error || !orders) return [];

    return orders.map(order => ({
        orderId: order.id,
        orderNumber: "G" + String(order.order_number).padStart(ORDER_NUMBER_PAD_LENGTH, "0"),
        status: order.status as OrderStatus,
        createdAt: order.created_at,
        updatedAt: (order as { updated_at?: string }).updated_at ?? order.created_at,
        userName: (order.users as { name?: string } | null)?.name ?? "—",
        items: ((order.order_items as { name: string; qty: number; special_request?: string }[]) ?? []).map(i => ({
            name: i.name,
            qty: i.qty,
            specialRequest: i.special_request,
        })),
    }));
};

export const updateOrderStatus = async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
    if (!orderId) throw new Error("orderId is required.");
    const res = await fetch("/api/update-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
    });
    const json = await res.json() as { ok: boolean; message?: string };
    if (!json.ok) throw new Error(json.message ?? "Failed to update order status.");
};

const getPromoCodeByCodeUpper = async (codeUpper: string): Promise<PromoCode> => {
    const { data, error } = await supabase
        .from(TABLE_PROMO_CODES)
        .select("*")
        .eq("code_upper", codeUpper)
        .maybeSingle();
    if (error || !data) throw new Error("Promo code not found.");
    return {
        id: data.id,
        codeUpper: data.code_upper,
        isActive: data.is_active,
        type: data.type as "PERCENT" | "FIXED",
        value: Number(data.value),
        maxDiscountCents: data.max_discount_cents ?? undefined,
        minSubtotalCents: data.min_subtotal_cents ?? undefined,
        usageLimitPerUser: data.usage_limit_per_user ?? 0,
    };
};

const hasUserRedeemedPromo = async (promoId: string, userId: string): Promise<boolean> => {
    const { count } = await supabase
        .from(TABLE_PROMO_REDEMPTIONS)
        .select("id", { count: "exact", head: true })
        .eq("promo_id", promoId)
        .eq("user_id", userId);
    return (count ?? 0) > 0;
};

const calculatePromoDiscount = (promo: PromoCode, subtotalCents: number) => {
    let discountCents = promo.type === "PERCENT"
        ? Math.round((subtotalCents * promo.value) / 100)
        : promo.value;
    if (promo.maxDiscountCents != null) discountCents = Math.min(discountCents, promo.maxDiscountCents);
    return Math.min(discountCents, subtotalCents);
};

export const getOrderEta = async (orderId: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from(TABLE_ORDER_DEPT_SLOTS)
        .select("dept_ready_at")
        .eq("order_id", orderId);
    if (error || !data?.length) return null;
    const max = data.reduce((m, r) => (r.dept_ready_at > m ? r.dept_ready_at : m), data[0].dept_ready_at);
    return max;
};

export const getDeptConfig = async (categoryIds: string[]): Promise<{ categoryId: string; maxWaitMinutes: number }[]> => {
    if (!categoryIds.length) return [];
    const { data, error } = await supabase
        .from(TABLE_DEPT_CONFIG)
        .select("category_id, max_wait_minutes")
        .in("category_id", categoryIds);
    if (error || !data) return [];
    return data.map(r => ({ categoryId: r.category_id, maxWaitMinutes: r.max_wait_minutes ?? DEFAULT_DEPT_MAX_WAIT_MINUTES }));
};

export const getDrinkMenuItems = async (): Promise<ReturnType<typeof getMenu>> => {
    const { data: category } = await supabase
        .from(TABLE_CATEGORIES)
        .select("id")
        .eq("name", SET_MEAL_UPGRADE_DRINKS_CATEGORY_NAME)
        .maybeSingle();
    if (!category) return [];
    return getMenu({ category: category.id, query: "" });
};

export const getSetMealUpgradeItem = async (): Promise<{ id: string } | null> => {
    const { data, error } = await supabase
        .from(TABLE_MENU)
        .select("id")
        .eq("name", SET_MEAL_UPGRADE_ITEM_NAME)
        .maybeSingle();
    if (error || !data) return null;
    return data as { id: string };
};

export const validatePromoCode = async ({
    code,
    userId,
    subtotalCents,
}: {
    code: string;
    userId: string;
    subtotalCents: number;
}) => {
    const codeUpper = code.trim().toUpperCase();
    if (!codeUpper) throw new Error("Promo code is required.");
    if (subtotalCents <= 0) throw new Error("Subtotal must be greater than zero.");

    const promo = await getPromoCodeByCodeUpper(codeUpper);
    if (!promo.isActive) throw new Error("Promo code is inactive.");
    if (promo.minSubtotalCents != null && subtotalCents < promo.minSubtotalCents) {
        throw new Error(`Minimum subtotal is $${(promo.minSubtotalCents / 100).toFixed(2)}.`);
    }
    if ((promo.usageLimitPerUser ?? 0) > 0 && await hasUserRedeemedPromo(promo.id, userId)) {
        throw new Error("Promo code already used.");
    }
    const discountCents = calculatePromoDiscount(promo, subtotalCents);
    if (discountCents <= 0) throw new Error("Promo code does not apply.");
    return { promoId: promo.id, codeUpper, discountCents };
};
