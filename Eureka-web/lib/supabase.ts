import { createClient } from "@supabase/supabase-js";
import type {
    CartItemType,
    CartTotalsResponse,
    CheckoutConfirmResponse,
    CheckoutResponse,
    CreateUserParams,
    GetMenuParams,
    OrderHistoryEntry,
    PromoCode,
    StaffOrder,
    OrderStatus,
    User,
} from "@/type";

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
        .from("users")
        .select("id, name, phone, role")
        .eq("phone", phone.trim())
        .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, name: data.name, phone: data.phone, role: data.role as "staff" | "customer" };
};

export const createUser = async ({ name, phone }: CreateUserParams): Promise<User> => {
    const formattedName = formatDisplayName(name);
    const { data, error } = await supabase
        .from("users")
        .insert({ name: formattedName, phone: phone.trim(), role: "customer" })
        .select("id, name, phone, role")
        .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to create user.");
    return { id: data.id, name: data.name, phone: data.phone, role: data.role as "staff" | "customer" };
};

export const getMenu = async ({ category, query }: GetMenuParams) => {
    let q = supabase
        .from("menu")
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
        .from("categories")
        .select("id, name, description, has_queue");
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
    limit = 5,
}: {
    userId: string;
    limit?: number;
}): Promise<OrderHistoryEntry[]> => {
    if (!userId) return [];

    const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, total, order_number, created_at")
        .eq("user_id", userId)
        .eq("is_paid", true)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error || !orders?.length) return [];

    const orderIds = orders.map(o => o.id);
    const { data: items } = await supabase
        .from("order_items")
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
            orderNumber: String(order.order_number),
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
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();
    if (error || !data) return null;
    return data.status as OrderStatus;
};

export const getActiveOrders = async (): Promise<StaffOrder[]> => {
    const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, order_number, created_at, updated_at, users(name), order_items(id, name, qty, special_request)")
        .eq("is_paid", true)
        .in("status", ["received", "preparing", "ready"])
        .order("created_at", { ascending: false })
        .limit(100);

    if (error || !orders) return [];

    return orders.map(order => ({
        orderId: order.id,
        orderNumber: String(order.order_number),
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
        .from("orders")
        .select("id, status, order_number, created_at, updated_at, users(name), order_items(id, name, qty, special_request)")
        .eq("is_paid", true)
        .eq("status", "collected")
        .order("created_at", { ascending: false })
        .limit(200);

    if (error || !orders) return [];

    return orders.map(order => ({
        orderId: order.id,
        orderNumber: String(order.order_number),
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
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) throw new Error(error.message);
};

const getPromoCodeByCodeUpper = async (codeUpper: string): Promise<PromoCode> => {
    const { data, error } = await supabase
        .from("promo_codes")
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
        .from("promo_redemptions")
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
        .from("order_dept_slots")
        .select("dept_ready_at")
        .eq("order_id", orderId);
    if (error || !data?.length) return null;
    const max = data.reduce((m, r) => (r.dept_ready_at > m ? r.dept_ready_at : m), data[0].dept_ready_at);
    return max;
};

export const getDeptConfig = async (categoryIds: string[]): Promise<{ categoryId: string; maxWaitMinutes: number }[]> => {
    if (!categoryIds.length) return [];
    const { data, error } = await supabase
        .from("dept_config")
        .select("category_id, max_wait_minutes")
        .in("category_id", categoryIds);
    if (error || !data) return [];
    return data.map(r => ({ categoryId: r.category_id, maxWaitMinutes: r.max_wait_minutes ?? 45 }));
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
