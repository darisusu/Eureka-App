import CustomButton from "@/components/CustomButton";
import { signOut } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";

export default function StaffScreen() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">(
    "dashboard"
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
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

    return () => {
      ScreenOrientation.unlockAsync().catch(() => {
        // Ignore unlock failures.
      });
    };
  }, []);

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

      {activeTab === "dashboard" ? (
        <View className="flex-1 px-6 py-4">
          <View className="flex-row gap-4 flex-1">
            {[
              { key: "received", count: 0 },
              { key: "preparing", count: 0 },
              { key: "ready", count: 0 },
            ].map((column) => (
              <View key={column.key} className="flex-1 bg-gray-50 rounded-2xl p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-gray-900">
                    {column.key.toUpperCase()}
                  </Text>
                  <View className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                    <Text className="text-xs font-bold text-gray-600">
                      {column.count}
                    </Text>
                  </View>
                </View>
                <ScrollView className="mt-4" contentContainerStyle={{ gap: 12 }}>
                  <View className="border border-dashed border-gray-300 rounded-xl p-3">
                    <Text className="text-sm text-gray-400">
                      No orders yet.
                    </Text>
                  </View>
                </ScrollView>
              </View>
            ))}
          </View>
        </View>
      ) : (
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
