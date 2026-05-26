import { CATEGORY_ITEM_LIMIT, CATEGORY_ITEM_LIMIT_NAMES } from "@/lib/config";
import { CartStore } from "@/type";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const normalizeRequest = (request?: string) => {
    const trimmed = request?.trim();
    return trimmed ? trimmed : undefined;
};

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            appliedPromo: null,
            isCartOpen: false,

            setAppliedPromo: (promo) => set({ appliedPromo: promo }),
            setCartOpen: (open) => set({ isCartOpen: open }),

            addItem: (item) => {
                const normalizedRequest = normalizeRequest(item.specialRequest);

                if (item.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(item.categoryName)) {
                    const restrictedQty = get().items
                        .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName))
                        .reduce((sum, i) => sum + i.quantity, 0);
                    if (restrictedQty >= CATEGORY_ITEM_LIMIT) return;
                }

                const existing = get().items.find(
                    (i) =>
                        i.id === item.id &&
                        normalizeRequest(i.specialRequest) === normalizedRequest
                );

                if (existing) {
                    set({
                        items: get().items.map((i) =>
                            i.id === item.id &&
                            normalizeRequest(i.specialRequest) === normalizedRequest
                                ? { ...i, quantity: i.quantity + 1 }
                                : i
                        ),
                    });
                } else {
                    set({
                        items: [
                            ...get().items,
                            { ...item, specialRequest: normalizedRequest, quantity: 1 },
                        ],
                    });
                }
            },

            removeItem: (id, specialRequest) => {
                const normalizedRequest = normalizeRequest(specialRequest);
                set({
                    items: get().items.filter(
                        (i) =>
                            !(
                                i.id === id &&
                                normalizeRequest(i.specialRequest) === normalizedRequest
                            )
                    ),
                });
            },

            increaseQty: (id, specialRequest) => {
                const normalizedRequest = normalizeRequest(specialRequest);
                const target = get().items.find(
                    (i) => i.id === id && normalizeRequest(i.specialRequest) === normalizedRequest
                );
                if (target?.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(target.categoryName)) {
                    const restrictedQty = get().items
                        .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName))
                        .reduce((sum, i) => sum + i.quantity, 0);
                    if (restrictedQty >= CATEGORY_ITEM_LIMIT) return;
                }
                set({
                    items: get().items.map((i) =>
                        i.id === id &&
                        normalizeRequest(i.specialRequest) === normalizedRequest
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    ),
                });
            },

            decreaseQty: (id, specialRequest) => {
                const normalizedRequest = normalizeRequest(specialRequest);
                set({
                    items: get()
                        .items.map((i) =>
                            i.id === id &&
                            normalizeRequest(i.specialRequest) === normalizedRequest
                                ? { ...i, quantity: i.quantity - 1 }
                                : i
                        )
                        .filter((i) => i.quantity > 0),
                });
            },

            clearCart: () => set({ items: [], appliedPromo: null }),

            purgeCategoryItems: (categoryIds) => {
                set({
                    items: get().items.filter(
                        (i) => !i.categoryId || !categoryIds.includes(i.categoryId)
                    ),
                });
            },

            getTotalItems: () =>
                get().items.reduce((total, item) => total + item.quantity, 0),

            getTotalPrice: () =>
                get().items.reduce(
                    (total, item) => total + item.quantity * item.price,
                    0
                ),
        }),
        {
            name: "eureka-cart",
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({ items: state.items, appliedPromo: state.appliedPromo }),
        }
    )
);
