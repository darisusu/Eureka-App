import { images } from "@/constants";
import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "@/components/CustomButton";
import { getRecentOrders, signOut } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import useOrdersStore, { RECENT_ORDERS_LIMIT } from "@/store/orders.store";
import { router } from "expo-router";
import type { OrderStatus } from "@/type";

const statusLabels: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  received: "Received",
  preparing: "Preparing",
  ready: "Ready",
  collected: "Collected",
};

const Profile = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const { user, isLoading, setIsAuthenticated, setUser } = useAuthStore();
  const recentOrders = useOrdersStore((state) => state.recentOrders);
  const setRecentOrders = useOrdersStore((state) => state.setRecentOrders);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user?.id) {
        if (isLoading) {
          return;
        }
        setRecentOrders([]);
        return;
      }

      setIsOrdersLoading(true);
      try {
        const orders = await getRecentOrders({
          userId: user.id,
          limit: RECENT_ORDERS_LIMIT,
        });
        setRecentOrders(orders);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load past orders.";
        Alert.alert("Orders", message);
      } finally {
        setIsOrdersLoading(false);
      }
    };

    void loadOrders();
  }, [user?.id, isLoading]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsAuthenticated(false);
      setUser(null);
      router.replace("/sign-in"); // Redirect to sign-in page after logout
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to log out.";
      Alert.alert("Error", message);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerClassName="px-6 pt-8 pb-24">
        <Text className="h1-bold text-dark-100">Profile</Text>

        <View className="mt-6">
          <Text className="paragraph-bold text-dark-100">Name</Text>
          <Text className="paragraph-medium text-gray-100 mt-1">
            {isLoading ? "Loading..." : user?.name ?? "—"}
          </Text>
        </View>

        <View className="mt-4">
          <Text className="paragraph-bold text-dark-100">Email</Text>
          <Text className="paragraph-medium text-gray-100 mt-1">
            {isLoading ? "Loading..." : user?.email ?? "—"}
          </Text>
        </View>

        <View className="mt-8">
          <Text className="h3-bold text-dark-100">Recent Orders</Text>
          <View className="mt-4 gap-4">
            {isOrdersLoading ? (
              <Text className="paragraph-medium text-gray-200">
                Loading recent orders...
              </Text>
            ) : recentOrders.length === 0 ? (
              <Text className="paragraph-medium text-gray-200">
                No recent orders yet.
              </Text>
            ) : (
              recentOrders.map((order) => (
                <View
                  key={order.orderId}
                  className="border border-gray-200 rounded-2xl p-4 bg-white"
                >
                  <View className="flex-row justify-between items-center">
                    <Text className="paragraph-bold text-dark-100">
                      {order.orderNumber}
                    </Text>
                    <Text className="paragraph-regular text-gray-200">
                      {order.dateLabel}
                    </Text>
                  </View>
                  <Text className="paragraph-regular text-gray-200 mt-2">
                    {order.itemsSummary}
                  </Text>
                  <View className="flex-row justify-between items-center mt-3">
                    <Text className="paragraph-bold text-dark-100">
                      ${order.total.toFixed(2)}
                    </Text>
                    <Text className="paragraph-bold text-primary">
                      {statusLabels[order.status] ?? order.status}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <CustomButton
          title="Log out"
          onPress={handleSignOut}
          style="mt-10 bg-red-500"
          leftIcon={
            <Image
              source={images.logout}
              className="w-5 h-5 mr-2"
              resizeMode="contain"
              tintColor="#FFFFFF"
            />
          }
          isLoading={isSigningOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
