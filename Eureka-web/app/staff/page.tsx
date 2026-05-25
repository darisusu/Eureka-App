"use client";

import CustomButton from "@/components/CustomButton";
import {
  getActiveOrders,
  getCollectedOrders,
  updateOrderStatus,
} from "@/lib/supabase";
import useAuthStore from "@/store/auth.store";
import type { StaffOrder } from "@/type";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export default function StaffScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "settings">("dashboard");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [historyOrders, setHistoryOrders] = useState<StaffOrder[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { user, logout, isAuthenticated } = useAuthStore();
  const pollVersion = useRef(0);
  const isUpdating = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "staff") {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, user?.role]);

  const fetchActiveOrders = async (isMounted: { current: boolean }) => {
    const myVersion = ++pollVersion.current;
    try {
      const data = await getActiveOrders();
      if (isMounted.current && pollVersion.current === myVersion && !isUpdating.current) {
        setOrders(data);
        setOrdersError(null);
      }
    } catch (error) {
      if (isMounted.current) {
        setOrdersError(error instanceof Error ? error.message : "Failed to load orders.");
      }
    } finally {
      if (isMounted.current) setIsOrdersLoading(false);
    }
  };

  const fetchHistoryOrders = async (isMounted: { current: boolean }) => {
    try {
      const data = await getCollectedOrders();
      if (isMounted.current) {
        setHistoryOrders(data);
        setHistoryError(null);
      }
    } catch (error) {
      if (isMounted.current) {
        setHistoryError(error instanceof Error ? error.message : "Failed to load order history.");
      }
    } finally {
      if (isMounted.current) setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    const isMounted = { current: true };
    void fetchActiveOrders(isMounted);
    const interval = setInterval(() => fetchActiveOrders(isMounted), 10000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    void fetchHistoryOrders(isMounted);
    const interval = setInterval(() => fetchHistoryOrders(isMounted), 15000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  const getTimeLabel = (order: StaffOrder) => {
    const reference = order.status === "received" ? order.createdAt : order.updatedAt;
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(reference).getTime()) / 60000));
    if (order.status === "received") return `Waiting ${minutes} min`;
    if (order.status === "preparing") return `Cooking ${minutes} min`;
    return `Ready ${minutes} min ago`;
  };

  const handleOrderAction = async (order: StaffOrder) => {
    const nextStatusMap: Record<StaffOrder["status"], StaffOrder["status"]> = {
      received: "preparing",
      preparing: "ready",
      ready: "collected",
      pending_payment: "received",
      paid: "received",
      collected: "collected",
      cancelled: "cancelled",
    };
    const nextStatus = nextStatusMap[order.status];
    if (!nextStatus || nextStatus === order.status) return;

    const updatedOrder: StaffOrder = {
      ...order,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    pollVersion.current += 1; // invalidate polls that started before this click
    isUpdating.current = true; // block polls that start after this click but resolve before API
    setOrders((prev) => {
      const filtered = prev.filter((item) => item.orderId !== order.orderId);
      if (nextStatus === "collected") return filtered;
      return [updatedOrder, ...filtered];
    });

    if (nextStatus === "collected") {
      setHistoryOrders((prev) => [updatedOrder, ...prev]);
    }

    try {
      await updateOrderStatus({ orderId: order.orderId, status: nextStatus });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update order status.");
      setOrders((prev) => {
        const filtered = prev.filter((item) => item.orderId !== order.orderId);
        if (nextStatus === "collected") return filtered;
        return [order, ...filtered];
      });
      if (nextStatus === "collected") {
        setHistoryOrders((prev) => prev.filter((o) => o.orderId !== order.orderId));
      }
    } finally {
      isUpdating.current = false;
    }
  };

  const handleSignOut = () => {
    setIsSigningOut(true);
    logout();
    router.replace("/sign-in");
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Tab bar */}
      <div className="border-b border-gray-200 px-6 py-2">
        <div className="flex items-center gap-4">
          {(["dashboard", "history", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                activeTab === tab ? "bg-black text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard tab */}
      {activeTab === "dashboard" && (
        <div className="flex-1 px-6 py-4 overflow-hidden">
          <div className="grid grid-cols-3 gap-4 h-full">
            {[
              { key: "received", actionLabel: "Start Prep" },
              { key: "preparing", actionLabel: "Mark Ready" },
              { key: "ready", actionLabel: "Mark Collected" },
            ].map((column) => (
              <div key={column.key} className="flex flex-col bg-gray-50 rounded-2xl p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <span className="text-base font-bold text-gray-900">
                    {column.key.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-600">
                    {orders.filter((o) => o.status === column.key).length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-3">
                  {isOrdersLoading ? (
                    <div className="border border-dashed border-gray-300 rounded-xl p-3">
                      <p className="text-sm text-gray-400">Loading orders...</p>
                    </div>
                  ) : ordersError ? (
                    <div className="border border-dashed border-gray-300 rounded-xl p-3">
                      <p className="text-sm text-gray-400">{ordersError}</p>
                    </div>
                  ) : orders.filter((o) => o.status === column.key).length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-xl p-3">
                      <p className="text-sm text-gray-400">No orders yet.</p>
                    </div>
                  ) : (
                    [...orders]
                      .filter((o) => o.status === column.key)
                      .sort((a, b) => {
                        const aTime = new Date(
                          a.status === "received" ? a.createdAt : a.updatedAt
                        ).getTime();
                        const bTime = new Date(
                          b.status === "received" ? b.createdAt : b.updatedAt
                        ).getTime();
                        return bTime - aTime;
                      })
                      .map((order) => (
                        <div
                          key={order.orderId}
                          className="bg-white border border-gray-200 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-gray-900">
                              {order.orderNumber}
                            </span>
                            <span className="text-xs font-semibold text-gray-500">
                              {getTimeLabel(order)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{order.userName}</p>
                          <div className="mt-3 flex flex-col gap-1">
                            {order.items.length === 0 ? (
                              <p className="text-xs text-gray-400">Items unavailable.</p>
                            ) : (
                              order.items.map((item, index) => (
                                <p
                                  key={`${order.orderId}-${index}`}
                                  className="text-xs text-gray-700"
                                >
                                  {item.qty}x {item.name}
                                  {item.specialRequest ? ` (${item.specialRequest}*)` : ""}
                                </p>
                              ))
                            )}
                          </div>
                          <button
                            onClick={() => handleOrderAction(order)}
                            className="mt-4 bg-black rounded-full px-4 py-2 text-xs font-bold text-white hover:opacity-80 transition-opacity"
                          >
                            {column.actionLabel}
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900">History</h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Collected orders (latest first).
          </p>
          <div className="flex flex-col gap-3">
            {isHistoryLoading ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-3">
                <p className="text-sm text-gray-400">Loading history...</p>
              </div>
            ) : historyError ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-3">
                <p className="text-sm text-gray-400">{historyError}</p>
              </div>
            ) : historyOrders.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-xl p-3">
                <p className="text-sm text-gray-400">No collected orders yet.</p>
              </div>
            ) : (
              historyOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="bg-white border border-gray-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      {getTimeLabel(order)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{order.userName}</p>
                  <div className="mt-3 flex flex-col gap-1">
                    {order.items.length === 0 ? (
                      <p className="text-xs text-gray-400">Items unavailable.</p>
                    ) : (
                      order.items.map((item, index) => (
                        <p
                          key={`${order.orderId}-history-${index}`}
                          className="text-xs text-gray-700"
                        >
                          {item.qty}x {item.name}
                          {item.specialRequest ? ` (${item.specialRequest})` : ""}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings tab */}
      {activeTab === "settings" && (
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900">Staff Settings</h2>
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-700">Name</p>
            <p className="text-base text-gray-500 mt-1">{user?.name ?? "—"}</p>
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-700">Phone</p>
            <p className="text-base text-gray-500 mt-1">{user?.phone ?? "—"}</p>
          </div>
          <CustomButton
            title="Log out"
            className="mt-8 bg-red-500"
            isLoading={isSigningOut}
            onClick={handleSignOut}
          />
        </div>
      )}
    </div>
  );
}
