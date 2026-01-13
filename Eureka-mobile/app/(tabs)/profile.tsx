import React, { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "@/components/CustomButton";
import { signOut } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import { router } from "expo-router";

//TODO:
// Link with real user data from backend/store
// Add sign out functionality

const pastOrders = [
  {
    id: "E2847",
    date: "Jan 12, 2025",
    total: 18.5,
    status: "Collected",
    items: "2x Sliced Fish Soup, 1x Teh C",
  },
  {
    id: "E2719",
    date: "Jan 08, 2025",
    total: 9.0,
    status: "Ready",
    items: "1x Fish Soup",
  },
];

const Profile = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { user, isLoading, setIsAuthenticated, setUser } = useAuthStore();

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
          <Text className="h3-bold text-dark-100">Past Orders</Text>
          <View className="mt-4 gap-4">
            {pastOrders.length === 0 ? (
              <Text className="paragraph-medium text-gray-200">
                No past orders yet.
              </Text>
            ) : (
              pastOrders.map((order) => (
                <View
                  key={order.id}
                  className="border border-gray-200 rounded-2xl p-4 bg-white"
                >
                  <View className="flex-row justify-between items-center">
                    <Text className="paragraph-bold text-dark-100">
                      {order.id}
                    </Text>
                    <Text className="paragraph-regular text-gray-200">
                      {order.date}
                    </Text>
                  </View>
                  <Text className="paragraph-regular text-gray-200 mt-2">
                    {order.items}
                  </Text>
                  <View className="flex-row justify-between items-center mt-3">
                    <Text className="paragraph-bold text-dark-100">
                      ${order.total.toFixed(2)}
                    </Text>
                    <Text className="paragraph-bold text-primary">
                      {order.status}
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
          isLoading={isSigningOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
