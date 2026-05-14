import { Models } from "appwrite";
import type { StaticImageData } from "next/image";

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
    id: string;
    accountId: string;
    name: string;
    email: string;
    avatar: string;
    role: "staff" | "customer";
};

export type OrderStatus =
    | "pending_payment"
    | "paid"
    | "received"
    | "preparing"
    | "ready"
    | "collected";

export interface Order {
    userId: string;
    status: OrderStatus;
    isPaid: boolean;
    total: number;
    orderNumber: string;
    promoId?: string;
    promoCode?: string;
    discountCents?: number;
    paymentIntentId?: string;
}

export interface OrderDocument extends Models.Document {
    userId: string;
    status: OrderStatus;
    isPaid: boolean;
    total: number;
    orderNumber: string;
    promoId?: string;
    promoCode?: string;
    discountCents?: number;
    paymentIntentId?: string;
}

export interface OrderItem {
    orderId: string;
    menuId: string;
    name: string;
    price: number;
    qty: number;
    specialRequest?: string;
}

export interface OrderItemDocument extends Models.Document {
    orderId: string;
    menuId: string;
    name: string;
    price: number;
    qty: number;
    specialRequest?: string;
}

export type StaffOrderItem = {
    name: string;
    qty: number;
    specialRequest?: string;
};

export type StaffOrder = {
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
    userName: string;
    items: StaffOrderItem[];
};

export type OrderHistoryEntry = {
    orderId: string;
    orderNumber: string;
    dateLabel: string;
    total: number;
    status: OrderStatus;
    itemsSummary: string;
};

export interface CartItemType {
    id: string;
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

export type PromoType = "PERCENT" | "FIXED";

export interface PromoCode {
    $id: string;
    codeUpper: string;
    isActive: boolean;
    type: PromoType;
    value: number;
    maxDiscountCents?: number;
    minSubtotalCents?: number;
    usageLimitPerUser: number;
}

export type CartTotalsResponse = {
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
    promo: { promoId: string; codeUpper: string; discountCents: number } | null;
};

export type CheckoutResponse = CartTotalsResponse & {
    orderId: string;
    orderNumber: string;
    paymentRequired: boolean;
    paymentIntentId: string | null;
    clientSecret: string | null;
};

export type CheckoutConfirmResponse = {
    orderId: string;
    status: OrderStatus;
    isPaid: boolean;
};

export type EstimatedTime = {
    range: string;
    note: string;
};

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
}

export interface CustomButtonProps {
    onClick?: () => void;
    title?: string;
    className?: string;
    leftIcon?: React.ReactNode;
    isLoading?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
}

export interface CustomInputProps {
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label: string;
    type?: string;
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

export type ImageAsset = StaticImageData | string;
