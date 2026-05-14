import type {
    CartItemType,
    CartTotalsResponse,
    CheckoutConfirmResponse,
    CheckoutResponse,
    CreateUserParams,
    GetMenuParams,
    OrderDocument,
    OrderHistoryEntry,
    OrderItemDocument,
    PromoCode,
    SignInParams,
    StaffOrder,
    OrderStatus,
    User,
} from "@/type";
import { Account, AppwriteException, Avatars, Client, Databases, Functions, ID, Query, Storage } from "appwrite";


// Appwrite configuration
export const appwriteConfig = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!,
    userCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USER_COLLECTION_ID!,
    categoriesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID!,
    menuCollectionId: process.env.NEXT_PUBLIC_APPWRITE_MENU_COLLECTION_ID!,
    ordersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!,
    ordersItemsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ORDER_ITEMS_COLLECTION_ID!,
    promoRedemptionsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID!,
    promoCodesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PROMO_CODES_COLLECTION_ID!,
    calculateOrderFunctionId: process.env.NEXT_PUBLIC_APPWRITE_CALCULATE_ORDER_FUNCTION_ID!,
    createCheckoutFunctionId: process.env.NEXT_PUBLIC_APPWRITE_CREATE_CHECKOUT_FUNCTION_ID!,
}

export const client = new Client();

client
    .setEndpoint(appwriteConfig.endpoint!)
    .setProject(appwriteConfig.projectId!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
const avatars = new Avatars(client);

const formatDisplayName = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");

export const createUser = async ({ email, password, name }: CreateUserParams) => {
    try {
        const formattedName = formatDisplayName(name);
        const newAccount = await account.create(
            ID.unique(),
            email,
            password,
            formattedName
        );

        if (!newAccount) {
            throw new Error("Failed to create account");
        }
        await signIn({ email, password });

        const avatarUrl = avatars.getInitials(formattedName);

        return await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            newAccount.$id,
            {
                email,
                name: formattedName,
                accountId: newAccount.$id,
                avatar: avatarUrl.toString(),
                role: "customer",
            }
        );
    } catch (e) {
        throw new Error(e instanceof Error ? e.message : String(e));
    }
};

export const signIn = async ({ email, password }: SignInParams) => {
    try {
        return await account.createEmailPasswordSession(email, password);
    } catch (e) {
        throw new Error(e instanceof Error ? e.message : String(e));
    }
};

export const signOut = async () => {
    try {
        return await account.deleteSession("current");
    } catch (e) {
        throw new Error(e instanceof Error ? e.message : String(e));
    }
};

export const getCurrentUser = async (): Promise<User | null> => {
    try {
        const currentAccount = await account.get();
        if (!currentAccount) throw new Error();

        let doc;
        try {
            doc = await databases.getDocument(
                appwriteConfig.databaseId,
                appwriteConfig.userCollectionId,
                currentAccount.$id
            );
        } catch (error) {
            const isNotFound =
                error instanceof AppwriteException ? error.code === 404 : false;
            if (!isNotFound) throw error;

            const fallback = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.userCollectionId,
                [Query.equal("accountId", currentAccount.$id), Query.limit(1)]
            );
            if (fallback.total > 0) {
                doc = fallback.documents[0];
            } else {
                const avatarUrl = avatars.getInitials(currentAccount.name);
                doc = await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.userCollectionId,
                    currentAccount.$id,
                    {
                        email: currentAccount.email,
                        name: currentAccount.name,
                        accountId: currentAccount.$id,
                        avatar: avatarUrl.toString(),
                        role: "customer",
                    }
                );
            }
        }

        const user: User = {
            id: doc.$id,
            accountId: doc.accountId,
            name: doc.name,
            email: doc.email,
            avatar: doc.avatar,
            role: doc.role ?? "customer",
        };

        return user;
    } catch {
        return null;
    }
};

export const getMenu = async ({ category, query }: GetMenuParams) => {
    try {
        const queries: string[] = [];

        if (category) queries.push(Query.equal("categories", category));
        if (query) queries.push(Query.search("name", query));

        const menus = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.menuCollectionId,
            queries
        );

        return menus.documents;
    } catch (e) {
        throw new Error(e instanceof Error ? e.message : String(e));
    }
};

export const getCategories = async () => {
    try {
        const categories = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.categoriesCollectionId
        );
        return categories.documents;
    } catch (e) {
        throw new Error(e instanceof Error ? e.message : String(e));
    }
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
    if (!appwriteConfig.calculateOrderFunctionId) {
        throw new Error("Appwrite function id is not configured.");
    }

    const payload = JSON.stringify({
        userId,
        promoCode,
        items: items.map((item) => ({
            menuId: item.id,
            quantity: item.quantity,
        })),
    });

    const execution = await functions.createExecution(
        appwriteConfig.calculateOrderFunctionId,
        payload,
        false
    );

    const raw = execution.responseBody ?? "";
    let response: { ok?: boolean; message?: string; data?: CartTotalsResponse } | null = null;
    if (raw) {
        try {
            response = JSON.parse(raw);
        } catch {
            throw new Error("Invalid response from pricing function.");
        }
    }

    if (!response || response.ok === false || !response.data) {
        throw new Error(response?.message ?? "Failed to calculate cart totals.");
    }

    return response.data;
};

export const createCheckout = async ({
    userId,
    items,
    promoCode,
    customerEmail,
}: {
    userId: string;
    items: CartItemType[];
    promoCode?: string | null;
    customerEmail?: string;
}): Promise<CheckoutResponse> => {
    if (!appwriteConfig.createCheckoutFunctionId) {
        throw new Error("Checkout function id is not configured.");
    }

    const payload = JSON.stringify({
        action: "create",
        userId,
        promoCode,
        customerEmail,
        items: items.map((item) => ({
            menuId: item.id,
            quantity: item.quantity,
            specialRequest: item.specialRequest,
        })),
    });

    const execution = await functions.createExecution(
        appwriteConfig.createCheckoutFunctionId,
        payload,
        false
    );

    const raw = execution.responseBody ?? "";
    let response: { ok?: boolean; message?: string; data?: CheckoutResponse } | null = null;
    if (raw) {
        try {
            response = JSON.parse(raw);
        } catch {
            throw new Error("Invalid response from checkout function.");
        }
    }

    if (!response || response.ok === false || !response.data) {
        throw new Error(response?.message ?? "Failed to create checkout.");
    }

    return response.data;
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
    if (!appwriteConfig.createCheckoutFunctionId) {
        throw new Error("Checkout function id is not configured.");
    }

    const payload = JSON.stringify({
        action: "confirm",
        userId,
        orderId,
        paymentIntentId,
    });

    const execution = await functions.createExecution(
        appwriteConfig.createCheckoutFunctionId,
        payload,
        false
    );

    const raw = execution.responseBody ?? "";
    let response: { ok?: boolean; message?: string; data?: CheckoutConfirmResponse } | null = null;
    if (raw) {
        try {
            response = JSON.parse(raw);
        } catch {
            throw new Error("Invalid response from checkout confirmation.");
        }
    }

    if (!response || response.ok === false || !response.data) {
        throw new Error(response?.message ?? "Failed to confirm payment.");
    }

    return response.data;
};

export const getRecentOrders = async ({
    userId,
    limit = 5,
}: {
    userId: string;
    limit?: number;
}): Promise<OrderHistoryEntry[]> => {
    if (!userId) return [];

    const ordersResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        [
            Query.equal("userId", userId),
            Query.equal("isPaid", true),
            Query.orderDesc("$createdAt"),
            Query.limit(limit),
        ]
    );

    const orders = ordersResponse.documents as unknown as OrderDocument[];
    if (orders.length === 0) return [];

    const orderIds = orders.map((order) => order.$id);
    const itemsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersItemsCollectionId,
        [Query.equal("orderId", orderIds), Query.limit(100)]
    );
    const items = itemsResponse.documents as unknown as OrderItemDocument[];

    const itemsByOrderId = new Map<string, OrderItemDocument[]>();
    for (const item of items) {
        const existing = itemsByOrderId.get(item.orderId) ?? [];
        existing.push(item);
        itemsByOrderId.set(item.orderId, existing);
    }

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-SG", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    return orders.map((order) => {
        const orderItems = itemsByOrderId.get(order.$id) ?? [];
        const itemsSummary = orderItems.length
            ? orderItems.map((item) => `${item.qty}x ${item.name}`).join(", ")
            : "Items unavailable";

        return {
            orderId: order.$id,
            orderNumber: order.orderNumber || order.$id,
            dateLabel: formatDate(order.$createdAt),
            total: Number(order.total ?? 0),
            status: order.status,
            itemsSummary,
        };
    });
};

export const getActiveOrders = async (): Promise<StaffOrder[]> => {
    const ordersResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        [
            Query.equal("isPaid", true),
            Query.equal("status", ["received", "preparing", "ready"]),
            Query.orderDesc("$createdAt"),
            Query.limit(100),
        ]
    );

    const orders = ordersResponse.documents as unknown as OrderDocument[];
    if (orders.length === 0) return [];

    const orderIds = orders.map((order) => order.$id);
    const itemsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersItemsCollectionId,
        [Query.equal("orderId", orderIds), Query.limit(300)]
    );
    const items = itemsResponse.documents as unknown as OrderItemDocument[];

    const itemsByOrderId = new Map<string, OrderItemDocument[]>();
    for (const item of items) {
        const existing = itemsByOrderId.get(item.orderId) ?? [];
        existing.push(item);
        itemsByOrderId.set(item.orderId, existing);
    }

    const userIds = Array.from(new Set(orders.map((order) => order.userId)));
    const usersById = new Map<string, { name?: string }>();
    if (userIds.length > 0) {
        const usersResponse = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal("$id", userIds), Query.limit(userIds.length)]
        );
        for (const user of usersResponse.documents) {
            usersById.set(user.$id, { name: (user as { name?: string }).name });
        }
    }

    return orders.map((order) => {
        const orderItems = itemsByOrderId.get(order.$id) ?? [];
        return {
            orderId: order.$id,
            orderNumber: order.orderNumber || order.$id,
            status: order.status,
            createdAt: order.$createdAt,
            updatedAt: order.$updatedAt,
            userName: usersById.get(order.userId)?.name ?? "—",
            items: orderItems.map((item) => ({
                name: item.name,
                qty: item.qty,
                specialRequest: item.specialRequest,
            })),
        };
    });
};

export const getCollectedOrders = async (): Promise<StaffOrder[]> => {
    const ordersResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        [
            Query.equal("isPaid", true),
            Query.equal("status", "collected"),
            Query.orderDesc("$updatedAt"),
            Query.limit(200),
        ]
    );

    const orders = ordersResponse.documents as unknown as OrderDocument[];
    if (orders.length === 0) return [];

    const orderIds = orders.map((order) => order.$id);
    const itemsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.ordersItemsCollectionId,
        [Query.equal("orderId", orderIds), Query.limit(600)]
    );
    const items = itemsResponse.documents as unknown as OrderItemDocument[];

    const itemsByOrderId = new Map<string, OrderItemDocument[]>();
    for (const item of items) {
        const existing = itemsByOrderId.get(item.orderId) ?? [];
        existing.push(item);
        itemsByOrderId.set(item.orderId, existing);
    }

    const userIds = Array.from(new Set(orders.map((order) => order.userId)));
    const usersById = new Map<string, { name?: string }>();
    if (userIds.length > 0) {
        const usersResponse = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal("$id", userIds), Query.limit(userIds.length)]
        );
        for (const user of usersResponse.documents) {
            usersById.set(user.$id, { name: (user as { name?: string }).name });
        }
    }

    return orders.map((order) => {
        const orderItems = itemsByOrderId.get(order.$id) ?? [];
        return {
            orderId: order.$id,
            orderNumber: order.orderNumber || order.$id,
            status: order.status,
            createdAt: order.$createdAt,
            updatedAt: order.$updatedAt,
            userName: usersById.get(order.userId)?.name ?? "—",
            items: orderItems.map((item) => ({
                name: item.name,
                qty: item.qty,
                specialRequest: item.specialRequest,
            })),
        };
    });
};

export const updateOrderStatus = async ({
    orderId,
    status,
}: {
    orderId: string;
    status: OrderStatus;
}) => {
    if (!orderId) throw new Error("orderId is required.");

    await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.ordersCollectionId,
        orderId,
        { status }
    );
};

const getPromoCodeByCodeUpper = async (codeUpper: string): Promise<PromoCode> => {
    const promos = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.promoCodesCollectionId,
        [Query.equal("codeUpper", codeUpper)]
    );

    if (!promos || promos.total === 0) throw new Error("Promo code not found.");

    return promos.documents[0] as unknown as PromoCode;
};

const hasUserRedeemedPromo = async (promoId: string, userId: string): Promise<boolean> => {
    const redemptions = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.promoRedemptionsCollectionId,
        [Query.equal("promoId", promoId), Query.equal("userId", userId), Query.limit(1)]
    );
    return redemptions.total > 0;
};

const calculatePromoDiscount = (promo: PromoCode, subtotalCents: number) => {
    let discountCents = 0;

    if (promo.type === "PERCENT") {
        discountCents = Math.round((subtotalCents * promo.value) / 100);
    } else {
        discountCents = promo.value;
    }

    if (promo.maxDiscountCents !== undefined && promo.maxDiscountCents !== null) {
        discountCents = Math.min(discountCents, promo.maxDiscountCents);
    }

    return Math.min(discountCents, subtotalCents);
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
        const minDollars = (promo.minSubtotalCents / 100).toFixed(2);
        throw new Error(`Minimum subtotal is $${minDollars}.`);
    }

    const usageLimit = promo.usageLimitPerUser ?? 0;
    if (usageLimit > 0) {
        const existing = await hasUserRedeemedPromo(promo.$id, userId);
        if (existing) throw new Error("Promo code already used.");
    }

    const discountCents = calculatePromoDiscount(promo, subtotalCents);
    if (discountCents <= 0) throw new Error("Promo code does not apply.");

    return { promoId: promo.$id, codeUpper, discountCents };
};
