import type { CreateUserParams, GetMenuParams, Order, OrderItem, SignInParams } from "@/type";
import { Account, Avatars, Client, Databases, ID, Query, Storage } from "react-native-appwrite";
import type { User } from "@/type";

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
    orderItemsCollectionId: 'order_items',
}

export const client = new Client(); // create empty client (bridge between app and appwrite server)

//Configure client
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
        //create new account on appwrite
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

export const signIn = async ({email, password}: SignInParams) => {
    try {
        const session = await account.createEmailPasswordSession(email,password);
    } catch (e) {
        throw new Error(e as string);
    }
}

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

export const createOrder = async (order: Order) => {
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.ordersCollectionId,
    ID.unique(),
    order
  );
};

export const createOrderItem = async (item: OrderItem) => {
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.orderItemsCollectionId,
    ID.unique(),
    item
  );
};
