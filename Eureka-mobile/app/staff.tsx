import CustomButton from "@/components/CustomButton";
import {
  getActiveOrders,
  getCollectedOrders,
  signOut,
  updateOrderStatus,
} from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import type { StaffOrder } from "@/type";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";

export default function StaffScreen() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "history" | "settings"
  >("dashboard");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [historyOrders, setHistoryOrders] = useState<StaffOrder[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { user, setIsAuthenticated, setUser, isLoading } = useAuthStore();

  useEffect(() => {
    const lockLandscape = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } catch {
        // Ignore orientation lock failures (e.g., unsupported platform).
      }
    };

    lockLandscape();

    // Cleanup: unlock orientation on unmount.
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {
        // Ignore unlock failures.
      });
    };
  }, []);

  const fetchActiveOrders = async (isMounted: { current: boolean }) => {
    try {
      const data = await getActiveOrders();
      if (isMounted.current) {
        setOrders(data);
        setOrdersError(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load orders.";
      if (isMounted.current) {
        setOrdersError(message);
      }
    } finally {
      if (isMounted.current) {
        setIsOrdersLoading(false);
      }
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
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load order history.";
      if (isMounted.current) {
        setHistoryError(message);
      }
    } finally {
      if (isMounted.current) {
        setIsHistoryLoading(false);
      }
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
    const reference =
      order.status === "received" ? order.createdAt : order.updatedAt;
    const minutes = Math.max(
      0,
      Math.floor((Date.now() - new Date(reference).getTime()) / 60000)
    );
    if (order.status === "received") {
      return `Received ${minutes} min ago`;
    }
    if (order.status === "preparing") {
      return `Preping ${minutes} min`;
    }
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
    };
    const nextStatus = nextStatusMap[order.status];
    if (!nextStatus || nextStatus === order.status) {
      return;
    }

    const updatedOrder: StaffOrder = {
      ...order,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => {
      const filtered = prev.filter((item) => item.orderId !== order.orderId);
      if (nextStatus === "collected") {
        return filtered;
      }
      return [updatedOrder, ...filtered];
    });

    if (nextStatus === "collected") {
      setHistoryOrders((prev) => [updatedOrder, ...prev]);
    }

    try {
      await updateOrderStatus({ orderId: order.orderId, status: nextStatus });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update order status.";
      Alert.alert("Order update", message);
      const isMounted = { current: true };
      void fetchActiveOrders(isMounted);
      void fetchHistoryOrders(isMounted);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsAuthenticated(false);
      setUser(null);
      router.replace("/sign-in");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to log out.";
      Alert.alert("Error", message);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-200 px-6 py-2">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={() => setActiveTab("dashboard")}
            className={`px-3 py-1.5 rounded-full ${
              activeTab === "dashboard" ? "bg-black" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === "dashboard" ? "text-white" : "text-gray-500"
              }`}
            >
              Dashboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-full ${
              activeTab === "history" ? "bg-black" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === "history" ? "text-white" : "text-gray-500"
              }`}
            >
              History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("settings")}
            className={`px-3 py-1.5 rounded-full ${
              activeTab === "settings" ? "bg-black" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === "settings" ? "text-white" : "text-gray-500"
              }`}
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "dashboard" ? ( // Dashboard Tab
        <View className="flex-1 px-6 py-4">
          <View className="flex-row gap-4 flex-1">
            {[
              { key: "received", actionLabel: "Start Prep" },
              { key: "preparing", actionLabel: "Mark Ready" },
              { key: "ready", actionLabel: "Mark Collected" },
            ].map((column) => (
              <View
                key={column.key}
                className="flex-1 bg-gray-50 rounded-2xl p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-gray-900">
                    {column.key.toUpperCase()}
                  </Text>
                  <View className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                    <Text className="text-xs font-bold text-gray-600">
                      {orders.filter((order) => order.status === column.key)
                        .length ?? 0}
                    </Text>
                  </View>
                </View>
                <ScrollView
                  className="mt-4"
                  contentContainerStyle={{ gap: 12 }}
                >
                  {isOrdersLoading ? (
                    <View className="border border-dashed border-gray-300 rounded-xl p-3">
                      <Text className="text-sm text-gray-400">
                        Loading orders...
                      </Text>
                    </View>
                  ) : ordersError ? (
                    <View className="border border-dashed border-gray-300 rounded-xl p-3">
                      <Text className="text-sm text-gray-400">
                        {ordersError}
                      </Text>
                    </View>
                  ) : orders.filter((order) => order.status === column.key)
                      .length === 0 ? (
                    <View className="border border-dashed border-gray-300 rounded-xl p-3">
                      <Text className="text-sm text-gray-400">
                        No orders yet.
                      </Text>
                    </View>
                  ) : (
                    [...orders]
                      .filter((order) => order.status === column.key)
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
                        <View
                          key={order.orderId}
                          className="bg-white border border-gray-200 rounded-xl p-4"
                        >
                          <View className="flex-row items-center justify-between">
                            <Text className="text-base font-bold text-gray-900">
                              {order.orderNumber}
                            </Text>
                            <Text className="text-xs font-semibold text-gray-500">
                              {getTimeLabel(order)}
                            </Text>
                          </View>
                          <Text className="text-xs text-gray-500 mt-1">
                            {order.userName}
                          </Text>
                          <View className="mt-3 gap-1">
                            {order.items.length === 0 ? (
                              <Text className="text-xs text-gray-400">
                                Items unavailable.
                              </Text>
                            ) : (
                              order.items.map((item, index) => (
                                <Text
                                  key={`${order.orderId}-${index}`}
                                  className="text-xs text-gray-700"
                                >
                                  {item.qty}x {item.name}
                                  {item.specialRequest
                                    ? ` (${item.specialRequest}*)`
                                    : ""}
                                </Text>
                              ))
                            )}
                          </View>
                          <TouchableOpacity
                            className="mt-4 bg-black rounded-full px-4 py-2 self-start"
                            activeOpacity={0.8}
                            onPress={() => handleOrderAction(order)}
                          >
                            <Text className="text-xs font-bold text-white">
                              {column.actionLabel}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))
                  )}
                </ScrollView>
              </View>
            ))}
          </View>
        </View>
      ) : activeTab === "history" ? ( // History Tab
        <View className="flex-1 px-6 py-4">
          <Text className="text-lg font-bold text-gray-900">History</Text>
          <Text className="text-xs text-gray-500 mt-1">
            Collected orders (latest first).
          </Text>
          <ScrollView className="mt-4" contentContainerStyle={{ gap: 12 }}>
            {isHistoryLoading ? (
              <View className="border border-dashed border-gray-300 rounded-xl p-3">
                <Text className="text-sm text-gray-400">
                  Loading history...
                </Text>
              </View>
            ) : historyError ? (
              <View className="border border-dashed border-gray-300 rounded-xl p-3">
                <Text className="text-sm text-gray-400">{historyError}</Text>
              </View>
            ) : historyOrders.length === 0 ? (
              <View className="border border-dashed border-gray-300 rounded-xl p-3">
                <Text className="text-sm text-gray-400">
                  No collected orders yet.
                </Text>
              </View>
            ) : (
              historyOrders.map((order) => (
                <View
                  key={order.orderId}
                  className="bg-white border border-gray-200 rounded-xl p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-gray-900">
                      {order.orderNumber}
                    </Text>
                    <Text className="text-xs font-semibold text-gray-500">
                      {getTimeLabel(order)}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 mt-1">
                    {order.userName}
                  </Text>
                  <View className="mt-3 gap-1">
                    {order.items.length === 0 ? (
                      <Text className="text-xs text-gray-400">
                        Items unavailable.
                      </Text>
                    ) : (
                      order.items.map((item, index) => (
                        <Text
                          key={`${order.orderId}-history-${index}`}
                          className="text-xs text-gray-700"
                        >
                          {item.qty}x {item.name}
                          {item.specialRequest
                            ? ` (${item.specialRequest})`
                            : ""}
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      ) : ( // Settings Tab
        <View className="flex-1 px-6 py-6">
          <Text className="text-lg font-bold text-gray-900">Staff Settings</Text>
          <View className="mt-6">
            <Text className="text-sm font-semibold text-gray-700">Name</Text>
            <Text className="text-base text-gray-500 mt-1">
              {isLoading ? "Loading..." : user?.name ?? "—"}
            </Text>
          </View>
          <View className="mt-4">
            <Text className="text-sm font-semibold text-gray-700">Email</Text>
            <Text className="text-base text-gray-500 mt-1">
              {isLoading ? "Loading..." : user?.email ?? "—"}
            </Text>
          </View>
          <CustomButton
            title="Log out"
            onPress={handleSignOut}
            style="mt-8 bg-red-500"
            isLoading={isSigningOut}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
