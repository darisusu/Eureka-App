import type { CartItemType, CreateUserParams, GetMenuParams, Order, OrderItem, SignInParams } from "@/type";
import { Account, Avatars, Client, Databases, ID, Query, Storage } from "react-native-appwrite";
import type { User } from "@/type";


// Defining PromoCode type
type PromoType = "PERCENT" | "FIXED";
type PromoCode = {
    $id: string;
    codeUpper: string;
    isActive: boolean;
    type: PromoType;
    value: number;
    maxDiscountCents?: number;
    minSubtotalCents?: number;
    usageLimitPerUser: number;
};

// Appwrite configuration
export const appwriteConfig = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT, // url of backend server
    platform: "com.SGBoleh.eureka", // application identifier
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID, // project id
    databaseId: '6946654c00135532b1a5', // database id
    bucketId: '6950f39d0013f71e7771', // storage bucket id
    userCollectionId: 'user',
    categoriesCollectionId: 'categories', 
    menuCollectionId: 'menu',
    ordersCollectionId: 'orders',
    ordersItemsCollectionId: 'orders_items',
    promoRedemptionsCollectionId: 'promo_redemptions',
    promoCodesCollectionId: 'promo_codes',
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
const avatars = new Avatars(client);

//defining functions that interact with appwrite services
export const createUser = async ({email,password,name}: CreateUserParams) => { // parameter type: CreateUserParams, destructured so can use each field directly
    try {
        //create account on appwrite auth (not shown within database)
        const newAccount = await account.create(
            ID.unique(), // generates unique id
            email,
            password,
            name
        );

        //if no new account
        if (!newAccount) {
            throw new Error('Failed to create account');
        }
        await signIn({email,password});

        const avatarUrl = avatars.getInitialsURL(name); //generate avatar image using initials and store into database

        // create new user in user collection
        return await databases.createDocument(
            appwriteConfig.databaseId, //databaseId
            appwriteConfig.userCollectionId, //collectionId
            ID.unique(), //randomized unique id i.e documentId
            {email, name, accountId: newAccount.$id, avatar: avatarUrl} //data
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
        const currentUser = await databases.listDocuments( // user document (app specific details)
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [ Query.equal('accountId', currentAccount.$id)] //query: return documents where accountid matches current account id
        )
        if (!currentUser || currentUser.total === 0) {
            throw new Error('User not found');
        }

        const doc = currentUser.documents[0]; 
        const user: User = {
            id: doc.$id,
            accountId: doc.accountId,
            name: doc.name,
            email: doc.email,
            avatar: doc.avatar,
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

export const createOrder = async (order: Order) => {
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.ordersCollectionId,
    ID.unique(),
    order
  );
};

export const createPromoRedemption = async ({
  promoId,
  userId,
  discountCents,
}: {
  promoId: string;
  userId: string;
  discountCents?: number;
}) => {
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.promoRedemptionsCollectionId,
    ID.unique(),
    {
      promoId,
      userId,
      redeemedAt: new Date().toISOString(),
      discountCents,
    }
  );
};

export const createOrderItem = async (item: OrderItem) => {
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.ordersItemsCollectionId,
    ID.unique(),
    item
  );
};

const makeOrderNumber = () => {
    const d = new Date();
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    const rand = String(Math.floor(Math.floor(Math.random()*1000))).padStart(3, '0'); 
    return `E${rand}${hh}${mm}`;
}
export const placeOrder = async ({
  userId,
  items,
  total,
  promo,
}: {
  userId: string;
  items: CartItemType[];
  total: number;
  promo?: { promoId: string; promoCode: string; discountCents: number };
}) => {
    const orderDoc = await createOrder({
        userId,
        orderNumber: makeOrderNumber(),
        status: "received",
        isPaid: false,
        total,
        promoId: promo?.promoId,
        promoCode: promo?.promoCode,
        discountCents: promo?.discountCents,
    });
    
  await Promise.all( // runs parallel, waits for all order items to be created
    items.map((item) => // for each item in cart, create order item
      createOrderItem({
        orderId: orderDoc.$id, // store orderDoc id generated by appwrite, for items in same order
        menuId: item.id,
        name: item.name,
        price: item.price,
        qty: item.quantity,
        specialRequest: item.specialRequest?.trim() ? item.specialRequest : undefined,
      })
    )
  );

  if (promo) {
    await createPromoRedemption({
      promoId: promo.promoId,
      userId,
      discountCents: promo.discountCents,
    });
  }

  return orderDoc;
};

