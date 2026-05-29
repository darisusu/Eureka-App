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
    parent_category_id?: string | null;
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
    userPhone?: string;
    readyAt?: string | null;
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

export interface MenuOption {
    id: string;
    group_id: string;
    name: string;
    price_adder: number;
    is_available: boolean;
    sort_order: number;
}

export interface MenuOptionGroup {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    selection_type: "single" | "multi";
    is_required: boolean;
    sort_order: number;
    options: MenuOption[];
}

export interface FishSoupSelectedOption {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdder: number;
}

export interface FishSoupConfig {
    soupOption: FishSoupSelectedOption;
    baseOption: FishSoupSelectedOption;
    addOns: FishSoupSelectedOption[];
}

export interface CartItemUpgrade {
    upgradeItemId: string;
    drinkName: string;
    upgradePrice: number;
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
    fishSoupConfig?: FishSoupConfig;
}

export interface CartStore {
    items: CartItemType[];
    appliedPromo: { promoId: string; codeUpper: string; discountCents: number } | null;
    isCartOpen: boolean;
    addItem: (item: Omit<CartItemType, "quantity">) => void;
    removeItem: (id: string, specialRequest?: string, upgradeDrinkName?: string, fishSoupConfig?: FishSoupConfig) => void;
    increaseQty: (id: string, specialRequest?: string, upgradeDrinkName?: string, fishSoupConfig?: FishSoupConfig) => void;
    decreaseQty: (id: string, specialRequest?: string, upgradeDrinkName?: string, fishSoupConfig?: FishSoupConfig) => void;
    clearCart: () => void;
    setAppliedPromo: (promo: { promoId: string; codeUpper: string; discountCents: number } | null) => void;
    setCartOpen: (open: boolean) => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
    purgeCategoryItems: (categoryIds: string[]) => void;
    updateItem: (
        id: string,
        oldSpecialRequest: string | undefined,
        oldUpgradeDrinkName: string | undefined,
        updates: { specialRequest?: string; upgrade?: CartItemUpgrade; quantity: number; fishSoupConfig?: FishSoupConfig },
        oldFishSoupConfig?: FishSoupConfig
    ) => void;
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
