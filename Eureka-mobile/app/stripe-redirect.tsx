import CustomButton from "@/components/CustomButton";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Route used as the Stripe PaymentSheet returnURL for redirect-based methods.
const StripeRedirect = () => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/");
    }, 600); // Redirect after 600ms

    return () => clearTimeout(timeout);
  }, []);

  return (
    <SafeAreaView className="bg-white h-full">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <ActivityIndicator size="small" color="#FE8C00" />
        <Text className="paragraph-semibold text-dark-100">
          Returning to checkout...
        </Text>
        <Text className="paragraph-regular text-gray-200 text-center">
          If you are not redirected automatically, head back to your cart.
        </Text>
        <CustomButton title="Back to home" onPress={() => router.replace("/")} />
      </View>
    </SafeAreaView>
  );
};

export default StripeRedirect;
