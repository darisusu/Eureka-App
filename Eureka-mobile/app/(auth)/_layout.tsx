import useAuthStore from "@/store/auth.store";
import { Redirect, Slot } from "expo-router";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthLayout() {
  const { isAuthenticated, user } = useAuthStore();

  // if (!isAuthReady) return null; // TODO: or a loading component/spinner

  if (isAuthenticated) {
    return <Redirect href={user?.role === "staff" ? "/staff" : "/"} />;
  }
  

  return (
    <SafeAreaView className="bg-white h-full">
      <KeyboardAvoidingView
        behavior={Platform.OS == "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow px-6 pt-8 pb-8"
        >
          <View className="items-center">
            <View className="w-64">
              <Text className="text-2xl font-bold text-dark-100 text-center">
                Welcome to EUREKA
              </Text>
            </View>
            <Image
              source={require("../../assets/mascots/Fish-Default.png")}
              className="w-64 h-64 -mt-6"
              resizeMode="contain"
            />
          </View>
          <View className="w-full -mt-20">
            <Slot />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
