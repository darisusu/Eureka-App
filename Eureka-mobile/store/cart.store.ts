import { CartStore } from "@/type";
import { create } from "zustand";

// runs create function from Zustand to create store, when app is initialized
export const useCartStore = create<CartStore>((set, get) => ({
    items: [],

    addItem: (item) => {
        const existing = get().items.find((i) => i.id === item.id);

        if (existing) {
            set({
                items: get().items.map((i) =>
                    i.id === item.id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                ),
            });
        } else {
            set({
                items: [...get().items, { ...item, quantity: 1 }],
            });
        }
    },

    removeItem: (id) => {
        set({
            items: get().items.filter((i) => i.id !== id),
        });
    },

    increaseQty: (id) => {
        set({
            items: get().items.map((i) =>
                i.id === id
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            ),
        });
    },

    decreaseQty: (id) => {
        set({
            items: get()
                .items.map((i) =>
                    i.id === id
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
