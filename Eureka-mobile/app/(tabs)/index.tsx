import { Text, View, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFonts, PlayfairDisplay_900Black } from "@expo-google-fonts/playfair-display";
import { Feather } from "@expo/vector-icons"; // Icon for the timer
import { router } from "expo-router";

//TODO:
// Link up with real order data from backend/store
// Add animations to progress bar transitions
// Toggle: 
// Before order placed: "Recommended Dishes" view
// After order placed: "Order Status" view (current)


// --- DIMENSIONS & CONFIG ---
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const HEADER_HEIGHT_PCT = 0.30;
const TEXT_SIZE_PCT = 0.60;
const HEADER_HEIGHT = SCREEN_HEIGHT * HEADER_HEIGHT_PCT;
const FONT_SIZE = Math.min(HEADER_HEIGHT * TEXT_SIZE_PCT, SCREEN_WIDTH * 0.65);

// --- MOCK DATA FROM IMAGE ---
const orderDetails = {
  id: "#2847",
  status: "preparing",
  time: "15 min",
  items: [
    { qty: 2, name: "Sliced Fish Soup (Clear)" },
    { qty: 1, name: "Teh C" },
  ],
};

const preparationSteps = ["received", "preparing", "ready", "collected"];
const statusTextMap: Record<typeof preparationSteps[number], string> = {
  received: "Your Order Was Received",
  preparing: "Your Order Is Being Prepared",
  ready: "Your Order Is Ready",
  collected: "Order Collected",
};
const currentStatus = orderDetails.status;

export default function Index() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_900Black });

  if (!fontsLoaded) return null;

  return (
    <View className="flex-1 bg-gray-50">
      <View 
        className="absolute w-[200%] h-[100%] bg-gray-50 rounded-full -left-[50%]" 
        style={{ top: HEADER_HEIGHT }} 
      />

      {/* =================================================
          LAYER 2: TITLE (Eureka)
      ================================================= */}
      <View 
        className="absolute top-0 left-0 right-0 items-center justify-center z-0"
        style={{ height: HEADER_HEIGHT, top: -20 }}
      >
        <Text 
          className="text-primary shadow-sm opacity-90"
          style={{ 
            fontFamily: "PlayfairDisplay_900Black", 
            fontSize: FONT_SIZE, 
            lineHeight: FONT_SIZE, 
            letterSpacing: -1,
            includeFontPadding: false 
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          Eureka
        </Text>
      </View>

      {/* =================================================
          LAYER 3: CONTENT (Order Card)
      ================================================= */}
      <SafeAreaView className="flex-1" edges={['bottom']}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingTop: HEADER_HEIGHT - 60 }}
          className="px-6 -mt-2"
          showsVerticalScrollIndicator={false}
        >
          {/* THE ORDER CARD */}
          <View className="bg-white rounded-2xl shadow-lg overflow-hidden mb-10 border border-gray-100">
            
            {/* CARD HEADER (Orange) */}
            <View className="bg-orange-500 p-5">
              <View className="flex-row justify-between items-center mb-1">
                <View className="flex-row items-center gap-2">
                  <Feather name="box" size={20} color="white" />
                  <Text className="text-white text-xl font-bold">
                    Order {orderDetails.id}
                  </Text>
                </View>
                
                {/* Time Pill */}
                <View className="bg-white/20 px-3 py-1 rounded-full">
                  <Text className="text-white font-bold text-sm">
                    {orderDetails.time}
                  </Text>
                </View>
              </View>
              <Text className="text-orange-100 text-base font-medium mt-1">
                {statusTextMap[currentStatus]}
              </Text>
            </View>

            {/* CARD BODY (Items) */}
            <View className="p-6 bg-white">
              {orderDetails.items.map((item, index) => (
                <View key={index} className="flex-row items-center mb-3">
                  <Text className="text-gray-800 text-lg font-medium">
                    {item.qty}x  {item.name}
                  </Text>
                </View>
              ))}

              {/* DIVIDER */}
              <View className="h-[1px] bg-gray-100 my-6" />

              {/* PROGRESS BAR (Matches Image Style) */}
              <View>
                <View className="flex-row justify-between mb-2">
                  {preparationSteps.map((step, index) => {
                    // Mark steps as done up to and including current status.
                    const isDone = preparationSteps.indexOf(currentStatus) >= index;

                    return (
                      <Text 
                        key={step} 
                        className={`text-xs font-bold ${isDone ? "text-orange-500" : "text-gray-300"}`}
                      >
                        {step.toUpperCase()}
                      </Text>
                    )
                  })}
                </View>

                {/* The Bar */}
                <View className="h-2.5 bg-gray-200 rounded-full w-full overflow-hidden flex-row">
                   {/* Calculates width based on status:
                      received = 25%, preparing = 50%, ready = 75%, collected = 100% 
                   */}
                  <View 
                    className="h-full bg-orange-500 rounded-full" 
                    style={{ 
                      width: `${((preparationSteps.indexOf(currentStatus) + 1) / preparationSteps.length) * 100}%`,
                    }} 
                  />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/search")}
            className="bg-primary rounded-full py-4 px-6 items-center"
            activeOpacity={0.9}
          >
            <Text className="text-white text-lg font-bold">Order Now</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
