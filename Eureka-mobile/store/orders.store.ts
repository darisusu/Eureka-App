import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OrderHistoryEntry } from "@/type";

export const RECENT_ORDERS_LIMIT = 3;

type OrdersState = {
  recentOrders: OrderHistoryEntry[];
  setRecentOrders: (orders: OrderHistoryEntry[]) => void;
  addRecentOrder: (order: OrderHistoryEntry) => void;
  clearRecentOrders: () => void;
};

const trimRecentOrders = (orders: OrderHistoryEntry[]) =>
  orders.slice(0, RECENT_ORDERS_LIMIT);

const useOrdersStore = create<OrdersState>()(
  persist(
    (set) => ({
      recentOrders: [],
      setRecentOrders: (orders) =>
        set({ recentOrders: trimRecentOrders(orders) }),
      addRecentOrder: (order) =>
        set((state) => {
          const next = [
            order,
            ...state.recentOrders.filter(
              (existing) => existing.orderId !== order.orderId
            ),
          ];
          return { recentOrders: trimRecentOrders(next) };
        }),
      clearRecentOrders: () => set({ recentOrders: [] }),
    }),
    {
      name: "recent-orders",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useOrdersStore;
