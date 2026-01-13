import React, { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "@/components/CustomButton";
import { signOut } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import { router } from "expo-router";

//TODO:
// Link with real user data from backend/store
// Add history of orders placed
// Add sign out functionality

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
