import { CATEGORY_ITEM_LIMIT, CATEGORY_ITEM_LIMIT_NAMES } from "@/lib/config";
import { CartStore, FishSoupConfig } from "@/type";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const normalizeRequest = (request?: string) => {
    const trimmed = request?.trim();
    return trimmed ? trimmed : undefined;
};

const fishSoupKey = (config?: FishSoupConfig): string => {
    if (!config) return "";
    return [
        config.soupOption.optionId,
        config.baseOption.optionId,
        ...config.addOns.map(a => a.optionId).sort(),
    ].join("|");
};

const itemMatches = (
    i: { id: string; specialRequest?: string; upgrade?: { drinkName: string }; fishSoupConfig?: FishSoupConfig },
    id: string,
    specialRequest?: string,
    upgradeDrinkName?: string,
    fishSoupConfig?: FishSoupConfig,
) =>
    i.id === id &&
    normalizeRequest(i.specialRequest) === normalizeRequest(specialRequest) &&
    (i.upgrade?.drinkName ?? "") === (upgradeDrinkName ?? "") &&
    fishSoupKey(i.fishSoupConfig) === fishSoupKey(fishSoupConfig);

const fishSoupPriceAdder = (config?: FishSoupConfig): number => {
    if (!config) return 0;
    return config.soupOption.priceAdder
        + config.baseOption.priceAdder
        + config.addOns.reduce((s, a) => s + a.priceAdder, 0);
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

                const existing = get().items.find((i) =>
                    itemMatches(i, item.id, item.specialRequest, item.upgrade?.drinkName, item.fishSoupConfig)
                );

                if (existing) {
                    set({
                        items: get().items.map((i) =>
                            itemMatches(i, item.id, item.specialRequest, item.upgrade?.drinkName, item.fishSoupConfig)
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

            removeItem: (id, specialRequest, upgradeDrinkName, fishSoupConfig) => {
                set({
                    items: get().items.filter((i) => !itemMatches(i, id, specialRequest, upgradeDrinkName, fishSoupConfig)),
                });
            },

            increaseQty: (id, specialRequest, upgradeDrinkName, fishSoupConfig) => {
                const target = get().items.find((i) => itemMatches(i, id, specialRequest, upgradeDrinkName, fishSoupConfig));
                if (target?.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(target.categoryName)) {
                    const restrictedQty = get().items
                        .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName))
                        .reduce((sum, i) => sum + i.quantity, 0);
                    if (restrictedQty >= CATEGORY_ITEM_LIMIT) return;
                }
                set({
                    items: get().items.map((i) =>
                        itemMatches(i, id, specialRequest, upgradeDrinkName, fishSoupConfig)
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    ),
                });
            },

            decreaseQty: (id, specialRequest, upgradeDrinkName, fishSoupConfig) => {
                set({
                    items: get()
                        .items.map((i) =>
                            itemMatches(i, id, specialRequest, upgradeDrinkName, fishSoupConfig)
                                ? { ...i, quantity: i.quantity - 1 }
                                : i
                        )
                        .filter((i) => i.quantity > 0),
                });
            },

            updateItem: (id, oldSpecialRequest, oldUpgradeDrinkName, updates, oldFishSoupConfig) => {
                const items = get().items;
                const oldItem = items.find((i) => itemMatches(i, id, oldSpecialRequest, oldUpgradeDrinkName, oldFishSoupConfig));
                if (!oldItem) return;

                const newRequest = normalizeRequest(updates.specialRequest);
                const newDrinkName = updates.upgrade?.drinkName ?? "";
                const newFishSoupConfig = updates.fishSoupConfig;

                if (oldItem.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(oldItem.categoryName)) {
                    const otherRestrictedQty = items
                        .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName) && !itemMatches(i, id, oldSpecialRequest, oldUpgradeDrinkName, oldFishSoupConfig))
                        .reduce((sum, i) => sum + i.quantity, 0);
                    if (otherRestrictedQty + updates.quantity > CATEGORY_ITEM_LIMIT) return;
                }

                const configChanged =
                    newRequest !== normalizeRequest(oldSpecialRequest) ||
                    newDrinkName !== (oldUpgradeDrinkName ?? "") ||
                    fishSoupKey(newFishSoupConfig) !== fishSoupKey(oldFishSoupConfig);
                const existingNewConfig = configChanged
                    ? items.find((i) => itemMatches(i, id, newRequest, newDrinkName, newFishSoupConfig))
                    : null;

                if (existingNewConfig) {
                    set({
                        items: items
                            .filter((i) => !itemMatches(i, id, oldSpecialRequest, oldUpgradeDrinkName, oldFishSoupConfig))
                            .map((i) =>
                                itemMatches(i, id, newRequest, newDrinkName, newFishSoupConfig)
                                    ? { ...i, quantity: i.quantity + updates.quantity }
                                    : i
                            ),
                    });
                } else {
                    set({
                        items: items.map((i) =>
                            itemMatches(i, id, oldSpecialRequest, oldUpgradeDrinkName, oldFishSoupConfig)
                                ? { ...i, specialRequest: newRequest, upgrade: updates.upgrade, fishSoupConfig: newFishSoupConfig, quantity: updates.quantity }
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
                        total + item.quantity * (
                            item.price
                            + (item.upgrade?.upgradePrice ?? 0)
                            + fishSoupPriceAdder(item.fishSoupConfig)
                        ),
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
