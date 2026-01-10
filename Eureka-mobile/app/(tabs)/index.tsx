import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView className="bg-white h-full">
      <View className="flex-1 items-center pt-20">
        <Text className="h1-bold text-dark-100">
          Welcome to <Text className="text-primary">Eureka</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
