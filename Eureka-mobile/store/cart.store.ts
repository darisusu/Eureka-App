import { CartStore } from "@/type";
import { create } from "zustand";

const normalizeRequest = (request?: string) => {
    const trimmed = request?.trim();
    return trimmed ? trimmed : undefined;
};

// runs create function from Zustand to create store, when app is initialized
export const useCartStore = create<CartStore>((set, get) => ({
    items: [],

    addItem: (item) => {
        const normalizedRequest = normalizeRequest(item.specialRequest);
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

    clearCart: () => set({ items: [] }),

    getTotalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),

    getTotalPrice: () =>
        get().items.reduce(
            (total, item) => total + item.quantity * item.price,
            0
        ),
}));
