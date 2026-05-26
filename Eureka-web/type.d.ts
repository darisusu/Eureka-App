export interface MenuItem {
    id: string;
    name: string;
    description: string;
    image_url: string;
    price: number;
    category_id: string | null;
    is_available: boolean;
}

export interface Category {
    id: string;
    name: string;
    description: string | null;
    has_queue: boolean;
    available_from: string | null;
    available_until: string | null;
}

export type User = {
    id: string;
    name: string;
    phone: string;
    role: "staff" | "customer";
};

export type OrderStatus =
    | "pending_payment"
    | "paid"
    | "received"
    | "ready"
    | "collected"
    | "cancelled";

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

export interface OrderDocument {
    id: string;
    user_id: string;
    status: OrderStatus;
    is_paid: boolean;
    total: number;
    order_number: number;
    promo_id?: string;
    promo_code?: string;
    discount_cents?: number;
    payment_intent_id?: string;
    created_at: string;
}

export interface OrderItem {
    orderId: string;
    menuId: string;
    name: string;
    price: number;
    qty: number;
    specialRequest?: string;
}

export interface OrderItemDocument {
    id: string;
    order_id: string;
    menu_id: string;
    name: string;
    price: number;
    qty: number;
    special_request?: string;
    created_at: string;
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
    readyAt?: string;
};

export type OrderDetailItem = {
    name: string;
    qty: number;
    price: number;
    specialRequest?: string;
};

export type OrderDetail = {
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    total: number;
    discountCents: number;
    promoCode?: string;
    dateLabel: string;
    timeLabel: string;
    readyAt?: string;
    items: OrderDetailItem[];
};

export interface CartItemUpgrade {
    upgradeItemId: string;
    drinkName: string;
}

export interface CartItemType {
    id: string;
    name: string;
    price: number;
    image_url: string;
    quantity: number;
    specialRequest?: string;
    categoryId?: string;
    categoryName?: string;
    upgrade?: CartItemUpgrade;
}

export interface CartStore {
    items: CartItemType[];
    appliedPromo: { promoId: string; codeUpper: string; discountCents: number } | null;
    isCartOpen: boolean;
    addItem: (item: Omit<CartItemType, "quantity">) => void;
    removeItem: (id: string, specialRequest?: string, upgradeDrinkName?: string) => void;
    increaseQty: (id: string, specialRequest?: string, upgradeDrinkName?: string) => void;
    decreaseQty: (id: string, specialRequest?: string, upgradeDrinkName?: string) => void;
    clearCart: () => void;
    setAppliedPromo: (promo: { promoId: string; codeUpper: string; discountCents: number } | null) => void;
    setCartOpen: (open: boolean) => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
    purgeCategoryItems: (categoryIds: string[]) => void;
}

export type PromoType = "PERCENT" | "FIXED";

export interface PromoCode {
    id: string;
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
    readyAt?: string;
};

export type CheckoutConfirmResponse = {
    orderId: string;
    status: OrderStatus;
    isPaid: boolean;
    readyAt?: string;
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
    isLocked: boolean;
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
    name: string;
    phone: string;
}

export interface GetMenuParams {
    category: string;
    query: string;
}
