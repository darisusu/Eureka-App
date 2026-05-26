import { CATEGORY_ITEM_LIMIT, CATEGORY_ITEM_LIMIT_NAMES, SET_MEAL_UPGRADE_PRICE } from "@/lib/config";
import { CartStore } from "@/type";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const normalizeRequest = (request?: string) => {
    const trimmed = request?.trim();
    return trimmed ? trimmed : undefined;
};

const itemMatches = (
    i: { id: string; specialRequest?: string; upgrade?: { drinkName: string } },
    id: string,
    specialRequest?: string,
    upgradeDrinkName?: string,
) =>
    i.id === id &&
    normalizeRequest(i.specialRequest) === normalizeRequest(specialRequest) &&
    (i.upgrade?.drinkName ?? "") === (upgradeDrinkName ?? "");

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

                const existing = get().items.find((i) =>
                    itemMatches(i, item.id, item.specialRequest, item.upgrade?.drinkName)
                );

                if (existing) {
                    set({
                        items: get().items.map((i) =>
                            itemMatches(i, item.id, item.specialRequest, item.upgrade?.drinkName)
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

            removeItem: (id, specialRequest, upgradeDrinkName) => {
                set({
                    items: get().items.filter((i) => !itemMatches(i, id, specialRequest, upgradeDrinkName)),
                });
            },

            increaseQty: (id, specialRequest, upgradeDrinkName) => {
                const target = get().items.find((i) => itemMatches(i, id, specialRequest, upgradeDrinkName));
                if (target?.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(target.categoryName)) {
                    const restrictedQty = get().items
                        .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName))
                        .reduce((sum, i) => sum + i.quantity, 0);
                    if (restrictedQty >= CATEGORY_ITEM_LIMIT) return;
                }
                set({
                    items: get().items.map((i) =>
                        itemMatches(i, id, specialRequest, upgradeDrinkName)
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    ),
                });
            },

            decreaseQty: (id, specialRequest, upgradeDrinkName) => {
                set({
                    items: get()
                        .items.map((i) =>
                            itemMatches(i, id, specialRequest, upgradeDrinkName)
                                ? { ...i, quantity: i.quantity - 1 }
                                : i
                        )
                        .filter((i) => i.quantity > 0),
                });
            },

            updateItem: (id, oldSpecialRequest, oldUpgradeDrinkName, updates) => {
                const items = get().items;
                const oldItem = items.find((i) => itemMatches(i, id, oldSpecialRequest, oldUpgradeDrinkName));
                if (!oldItem) return;

                const newRequest = normalizeRequest(updates.specialRequest);
                const newDrinkName = updates.upgrade?.drinkName ?? "";

                if (oldItem.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(oldItem.categoryName)) {
                    const otherRestrictedQty = items
                        .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName) && !itemMatches(i, id, oldSpecialRequest, oldUpgradeDrinkName))
                        .reduce((sum, i) => sum + i.quantity, 0);
                    if (otherRestrictedQty + updates.quantity > CATEGORY_ITEM_LIMIT) return;
                }

                const configChanged =
                    newRequest !== normalizeRequest(oldSpecialRequest) ||
                    newDrinkName !== (oldUpgradeDrinkName ?? "");
                const existingNewConfig = configChanged
                    ? items.find((i) => itemMatches(i, id, newRequest, newDrinkName))
                    : null;

                if (existingNewConfig) {
                    set({
                        items: items
                            .filter((i) => !itemMatches(i, id, oldSpecialRequest, oldUpgradeDrinkName))
                            .map((i) =>
                                itemMatches(i, id, newRequest, newDrinkName)
                                    ? { ...i, quantity: i.quantity + updates.quantity }
                                    : i
                            ),
                    });
                } else {
                    set({
                        items: items.map((i) =>
                            itemMatches(i, id, oldSpecialRequest, oldUpgradeDrinkName)
                                ? { ...i, specialRequest: newRequest, upgrade: updates.upgrade, quantity: updates.quantity }
                                : i
                        ),
                    });
                }
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
                    (total, item) =>
                        total + item.quantity * (item.price + (item.upgrade ? SET_MEAL_UPGRADE_PRICE : 0)),
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
