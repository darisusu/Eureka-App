// TODO: Split into multiple files later, for different domains (e.g., MenuItem, User, Order, UI Components, Auth Params, etc.)
import { Models } from "react-native-appwrite";

export interface MenuItem extends Models.Document {
    name: string;
    description: string;
    image_url: string;
    price: number;
    category_name: string;
    prep_time_min: number;
}

export interface Category extends Models.Document {
    name: string;
    description: string;
}

export type User = {
    id: string;        // your document id (from doc.$id)
    accountId: string; // important, you store this
    name: string;
    email: string;
    avatar: string;
}

export interface Order {
    userId: string;
    status: "received" | "preparing" | "ready" | "collected";
    isPaid: boolean;
    total: number;
    orderNumber: string;
    promoId?: string;
    promoCode?: string;
    discountCents?: number;
}

export interface OrderItem {
    orderId: string;
    menuId: string;
    name: string;
    price: number;
    qty: number;
    specialRequest?: string;
}

export interface CartItemType {
    id: string; // menu item id
    name: string;
    price: number;
    image_url: string;
    quantity: number;
    specialRequest?: string;
}

export interface CartStore {
    items: CartItemType[];
    addItem: (item: Omit<CartItemType, "quantity">) => void;
    removeItem: (id: string, specialRequest?: string) => void;
    increaseQty: (id: string, specialRequest?: string) => void;
    decreaseQty: (id: string, specialRequest?: string) => void;
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
}

export interface TabBarIconProps {
    focused: boolean;
    icon: ImageSourcePropType;
    title: string;
}

export interface PaymentInfoSummaryProps {
    label: string;
    value: string;
    labelStyle?: string;
    valueStyle?: string;
}

 export interface CartFooterProps {
  totalItems: number;
  subtotalCents: number;
  discountCents: number;
  promoCode?: string | null;
  estimatedTime: EstimatedTime;
  isSubmitting: boolean;
  onApplyPromo: () => void;
  isApplyingPromo: boolean;
  setPromoCode: (value: string) => void;
  promoCodeInput: string;
  onOrderNow: () => void;
};


 export interface CustomButtonProps {
    onPress?: () => void;
    title?: string;
    style?: string;
    leftIcon?: React.ReactNode;
    textStyle?: string;
    isLoading?: boolean;
}

 export interface CustomHeaderProps {
    title?: string;
}

 export interface CustomInputProps {
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    label: string;
    secureTextEntry?: boolean;
    keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
}

 export interface ProfileFieldProps {
    label: string;
    value: string;
    icon: ImageSourcePropType;
}

 export interface CreateUserParams {
    email: string;
    password: string;
    name: string;
}

 export interface SignInParams {
    email: string;
    password: string;
}

 export interface GetMenuParams {
    category: string;
    query: string;
}
