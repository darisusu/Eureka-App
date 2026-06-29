import { createClient } from "@supabase/supabase-js";
import type {
    CartItemType,
    CartTotalsResponse,
    CheckoutConfirmResponse,
    CheckoutResponse,
    CreateUserParams,
    FishSoupConfig,
    GetMenuParams,
    MenuOptionGroup,
    OrderDetail,
    OrderHistoryEntry,
    StaffOrder,
    OrderStatus,
    User,
} from "@/type";
import { baseSummary, fishSoupOptionIds } from "@/lib/fishSoup";
import { resolveParentTiming } from "@/lib/time";
import {
    ORDER_NUMBER_PAD_LENGTH,
    RECENT_ORDERS_LIMIT,
    SET_MEAL_UPGRADE_DRINKS_CATEGORY_NAME,
    SET_MEAL_UPGRADE_ITEM_NAME,
    STAFF_ACTIVE_ORDERS_LIMIT,
    STAFF_HISTORY_ORDERS_LIMIT,
    TABLE_CATEGORIES,
    TABLE_MENU,
    TABLE_MENU_OPTION_GROUPS,
    TABLE_MENU_OPTIONS,
    TABLE_ORDER_ITEMS,
    TABLE_ORDERS,
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
    if (query) {
        if (!category) {
            const { data: matchingCats } = await supabase
                .from(TABLE_CATEGORIES)
                .select("id")
                .ilike("name", `%${query}%`);
            const catIds = matchingCats?.map((c) => c.id) ?? [];
            if (catIds.length > 0) {
                q = q.or(`name.ilike.%${query}%,category_id.in.(${catIds.join(",")})`);
            } else {
                q = q.ilike("name", `%${query}%`);
            }
        } else {
            q = q.ilike("name", `%${query}%`);
        }
    }
    const { data, error } = await q.order("sort_order", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
};

export const getCategories = async () => {
    const { data, error } = await supabase
        .from(TABLE_CATEGORIES)
        .select("id, name, description, has_queue, available_from, available_until, parent_category_id")
        .order("sort_order")
        .order("name");
    if (error) throw new Error(error.message);
    return resolveParentTiming(data ?? []);
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
    const expandedItems = items.flatMap(i => {
        if (i.fishSoupConfig) {
            const fishSoupEntry = {
                menuId: i.id,
                quantity: i.quantity,
                fishSoupOptionIds: fishSoupOptionIds(i.fishSoupConfig),
            };
            if (i.upgrade) {
                return [fishSoupEntry, { menuId: i.upgrade.upgradeItemId, quantity: i.quantity }];
            }
            return [fishSoupEntry];
        }
        const base = { menuId: i.id, quantity: i.quantity };
        if (i.upgrade) {
            return [base, { menuId: i.upgrade.upgradeItemId, quantity: i.quantity }];
        }
        return [base];
    });
    const res = await fetch("/api/calculate-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, promoCode, items: expandedItems }),
    });
    const result = await res.json();
    if (!result.ok || !result.data) throw new Error(result.message ?? "Failed to calculate cart totals.");
    return result.data;
};

const buildFishSoupSummary = (cfg: FishSoupConfig, userRequest?: string): string => {
    const lines: string[] = [];
    if (cfg.soupOption) lines.push(`Soup: ${cfg.soupOption.optionName}`);
    const base = baseSummary(cfg);
    if (base) lines.push(`Base: ${base}`);
    if (cfg.addOns.length > 0) {
        lines.push(`Add-ons: ${cfg.addOns.map(a => a.optionName).join(", ")}`);
    }
    if (userRequest) {
        lines.push(`Note: ${userRequest}`);
    }
    return lines.join("\n");
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
    const checkoutItems = items.flatMap(i => {
        if (i.fishSoupConfig) {
            const fishSoupItem = {
                menuId: i.id,
                quantity: i.quantity,
                specialRequest: buildFishSoupSummary(i.fishSoupConfig, i.specialRequest),
                fishSoupOptionIds: fishSoupOptionIds(i.fishSoupConfig),
                fishSoupConfig: i.fishSoupConfig,
            };
            if (i.upgrade) {
                return [fishSoupItem, { menuId: i.upgrade.upgradeItemId, quantity: i.quantity, specialRequest: i.upgrade.drinkName }];
            }
            return [fishSoupItem];
        }
        const base = { menuId: i.id, quantity: i.quantity, specialRequest: i.specialRequest };
        if (i.upgrade) {
            return [base, { menuId: i.upgrade.upgradeItemId, quantity: i.quantity, specialRequest: i.upgrade.drinkName }];
        }
        return [base];
    });
    const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", userId, promoCode, items: checkoutItems }),
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
        .select("id, status, order_number, created_at, updated_at, ready_at, users(name, phone), order_items(id, name, qty, special_request)")
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
        userName: (order.users as { name?: string; phone?: string } | null)?.name ?? "—",
        userPhone: (order.users as { name?: string; phone?: string } | null)?.phone,
        readyAt: (order as { ready_at?: string | null }).ready_at,
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
        .select("id, status, order_number, created_at, updated_at, ready_at, users(name, phone), order_items(id, name, qty, special_request)")
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
        userName: (order.users as { name?: string; phone?: string } | null)?.name ?? "—",
        userPhone: (order.users as { name?: string; phone?: string } | null)?.phone,
        readyAt: (order as { ready_at?: string | null }).ready_at,
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

export const getMenuOptionGroups = async (categoryId: string): Promise<MenuOptionGroup[]> => {
    const { data: groups, error } = await supabase
        .from(TABLE_MENU_OPTION_GROUPS)
        .select("id, category_id, name, description, selection_type, is_required, sort_order")
        .eq("category_id", categoryId)
        .order("sort_order");
    if (error || !groups?.length) return [];

    const groupIds = groups.map((g) => g.id);
    const { data: options, error: optErr } = await supabase
        .from(TABLE_MENU_OPTIONS)
        .select("id, group_id, name, price_adder, is_available, sort_order")
        .in("group_id", groupIds)
        .eq("is_available", true)
        .order("sort_order");
    if (optErr) return [];

    return groups.map((g) => ({
        ...g,
        options: (options ?? [])
            .filter((o) => o.group_id === g.id)
            .map((o) => ({ ...o, price_adder: Number(o.price_adder) })),
    }));
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

export const getSetMealUpgradeItem = async (): Promise<{ id: string; price: number } | null> => {
    const { data, error } = await supabase
        .from(TABLE_MENU)
        .select("id, price")
        .eq("name", SET_MEAL_UPGRADE_ITEM_NAME)
        .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, price: Number(data.price) };
};
