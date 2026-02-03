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
    User,
} from "@/type";
import { Account, AppwriteException, Avatars, Client, Databases, Functions, ID, Query, Storage } from "react-native-appwrite";


// Appwrite configuration
export const appwriteConfig = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT, // url of backend server
    platform: "com.SGBoleh.eureka", // application identifier
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!, // project id
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!, // database id
    bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID!, // storage bucket id
    userCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_COLLECTION_ID!,
    categoriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID!, 
    menuCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MENU_COLLECTION_ID!,
    ordersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!,
    ordersItemsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_ORDER_ITEMS_COLLECTION_ID!,
    promoRedemptionsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROMO_REDEMPTIONS_COLLECTION_ID!,
    promoCodesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROMO_CODES_COLLECTION_ID!,
    calculateOrderFunctionId: process.env.EXPO_PUBLIC_APPWRITE_CALCULATE_ORDER_FUNCTION_ID!,
    createCheckoutFunctionId: process.env.EXPO_PUBLIC_APPWRITE_CREATE_CHECKOUT_FUNCTION_ID!
    
}

export const client = new Client(); // create empty client (bridge between app and appwrite server)

//Configure client and set up connection to appwrite
client
    .setEndpoint(appwriteConfig.endpoint!) 
    .setProject(appwriteConfig.projectId!)
    .setPlatform(appwriteConfig.platform);

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

//defining functions that interact with appwrite services
export const createUser = async ({email,password,name}: CreateUserParams) => { // parameter type: CreateUserParams, destructured so can use each field directly
    try {
        const formattedName = formatDisplayName(name);
        //create account on appwrite auth (not shown within database)
        const newAccount = await account.create(
            ID.unique(), // generates unique id
            email,
            password,
            formattedName
        );

        if (!newAccount) {
            throw new Error('Failed to create account');
        }
        await signIn({email,password});

        const avatarUrl = avatars.getInitialsURL(formattedName); //generate avatar image using initials and store into database

        // create new user in user collection
        return await databases.createDocument(
            appwriteConfig.databaseId, //databaseId
            appwriteConfig.userCollectionId, //collectionId
            newAccount.$id, //use account id for user document id
            {
                email,
                name: formattedName,
                accountId: newAccount.$id,
                avatar: avatarUrl,
                role: "customer",
            } //data
        );
    

    } catch (e) {
        throw new Error(e as string);
    }
}

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
        const currentAccount = await account.get(); //uses current session token to get account details (authentication details)
        if (!currentAccount) {
            throw new Error;
        }
        let doc;
        try {
            doc = await databases.getDocument( // user document (app specific details)
                appwriteConfig.databaseId,
                appwriteConfig.userCollectionId,
                currentAccount.$id
            );
        } catch (error) {
            const isNotFound =
                error instanceof AppwriteException ? error.code === 404 : false;
            if (!isNotFound) {
                throw error;
            }
            // check if user document exists by querying accountId field
            const fallback = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.userCollectionId,
                [
                    Query.equal("accountId", currentAccount.$id),
                    Query.limit(1),
                ]
            );
            if (fallback.total > 0) {
                doc = fallback.documents[0];
            } else {
                // create user document if not found
                const avatarUrl = avatars.getInitialsURL(currentAccount.name);
                doc = await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.userCollectionId,
                    currentAccount.$id,
                    {
                        email: currentAccount.email,
                        name: currentAccount.name,
                        accountId: currentAccount.$id,
                        avatar: avatarUrl,
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
            role: doc.role ?? "customer" // default to customer if role not defined
        };

        return user;

    } catch (e) {
        return null;
    }

}
export const getMenu = async ({category, query}: GetMenuParams) => {
    try {
        const queries: string[] = [];
        
        if (category){ // if category filter is provided
            queries.push(Query.equal('categories', category));
        } 
        if (query) { // if search query is provided (name search)
            queries.push(Query.search('name', query));
        }

        const menus = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.menuCollectionId,
            queries // accumulated filters
        );

        return menus.documents;

    } catch (e) {
        throw new Error(e as string);
    }
}

export const getCategories = async () => {
    try {
        const categories = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.categoriesCollectionId,
        );

        return categories.documents; 
    } catch (e) {
        throw new Error(e as string);
    }
}

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
      response = JSON.parse(raw) as {
        ok?: boolean;
        message?: string;
        data?: CartTotalsResponse;
      };
    } catch {
      throw new Error("Invalid response from pricing function.");
    }
  }

  if (!response || response.ok === false || !response.data) {
    throw new Error(response?.message ?? "Failed to calculate cart totals.");
  }

  return response.data;
};

// Creates an order in a pending state and returns Stripe PaymentIntent details.
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
  let response:
    | { ok?: boolean; message?: string; data?: CheckoutResponse }
    | null = null;
  if (raw) {
    try {
      response = JSON.parse(raw) as {
        ok?: boolean;
        message?: string;
        data?: CheckoutResponse;
      };
    } catch {
      throw new Error("Invalid response from checkout function.");
    }
  }

  if (!response || response.ok === false || !response.data) {
    throw new Error(response?.message ?? "Failed to create checkout.");
  }

  return response.data;
};

// Confirms payment status on the server and updates the order to received.
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
  let response:
    | { ok?: boolean; message?: string; data?: CheckoutConfirmResponse }
    | null = null;
  if (raw) {
    try {
      response = JSON.parse(raw) as {
        ok?: boolean;
        message?: string;
        data?: CheckoutConfirmResponse;
      };
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
  if (orders.length === 0) {
    return [];
  }

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
  if (orders.length === 0) {
    return [];
  }

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
    const itemsSummary = orderItems.map((item) => ({
      name: item.name,
      qty: item.qty,
      specialRequest: item.specialRequest,
    }));

    return {
      orderId: order.$id,
      orderNumber: order.orderNumber || order.$id,
      status: order.status,
      createdAt: order.$createdAt,
      updatedAt: order.$updatedAt,
      userName: usersById.get(order.userId)?.name ?? "—",
      items: itemsSummary,
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
  if (orders.length === 0) {
    return [];
  }

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
    const itemsSummary = orderItems.map((item) => ({
      name: item.name,
      qty: item.qty,
      specialRequest: item.specialRequest,
    }));

    return {
      orderId: order.$id,
      orderNumber: order.orderNumber || order.$id,
      status: order.status,
      createdAt: order.$createdAt,
      updatedAt: order.$updatedAt,
      userName: usersById.get(order.userId)?.name ?? "—",
      items: itemsSummary,
    };
  });
};

// get PromoCode Object by codeUpper
const getPromoCodeByCodeUpper = async (codeUpper: string): Promise<PromoCode> => {
    const promos = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.promoCodesCollectionId,
        [Query.equal("codeUpper", codeUpper)]
    );

    if (!promos || promos.total === 0) {
        throw new Error("Promo code not found.");
    }

    return promos.documents[0] as unknown as PromoCode;
};

// check whether user has redeemed promo code before
const hasUserRedeemedPromo = async (promoId: string, userId: string): Promise<boolean> => {
    const redemptions = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.promoRedemptionsCollectionId,
        [
          Query.equal("promoId", promoId), 
          Query.equal("userId", userId),
          Query.limit(1) // only need one matching document to scan for, prevents loading extra
        ]
    );
    return redemptions.total > 0; // if any redemption found, return true
};

// calculate discount amount in cents based on promo code and subtotal
const calculatePromoDiscount = (promo: PromoCode, subtotalCents: number) => {
    let discountCents = 0;

    if (promo.type === "PERCENT") {
        discountCents = Math.round((subtotalCents * promo.value) / 100); // round to nearest cent
    } else {
        discountCents = promo.value;
    }

    // if max discount is defined, cap discount to max allowed
    if (promo.maxDiscountCents !== undefined && promo.maxDiscountCents !== null) {
        discountCents = Math.min(discountCents, promo.maxDiscountCents);
    }

    return Math.min(discountCents, subtotalCents);
};

// Main function to process PromoCode
// validate promo code and return discount details
// receives parameter object with {code, userId, subtotalCents}
// Right now validatePromoCode() runs client-side, and later the client could still place an order without actually creating a redemption record (or could fake values)
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
    if (!codeUpper) {
        throw new Error("Promo code is required.");
    }
    if (subtotalCents <= 0) {
        throw new Error("Subtotal must be greater than zero.");
    }

    const promo = await getPromoCodeByCodeUpper(codeUpper);

    if (!promo.isActive) {
        throw new Error("Promo code is inactive.");
    }

    // if minimum subtotal is defined, check if subtotal meets requirement
    if (promo.minSubtotalCents != null && subtotalCents < promo.minSubtotalCents) {
        const minDollars = (promo.minSubtotalCents / 100).toFixed(2);
        throw new Error(`Minimum subtotal is $${minDollars}.`);
    }

    const usageLimit = promo.usageLimitPerUser ?? 0;
    if (usageLimit > 0) {
        const existing = await hasUserRedeemedPromo(promo.$id, userId);
        if (existing === true) {
            throw new Error("Promo code already used.");
        }
    }

    const discountCents = calculatePromoDiscount(promo, subtotalCents);
    if (discountCents <= 0) {
        throw new Error("Promo code does not apply.");
    }

    return {
        promoId: promo.$id,
        codeUpper,
        discountCents,
    };
};
