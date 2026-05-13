import { Text, View, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts, PlayfairDisplay_900Black } from "@expo-google-fonts/playfair-display";
import { Feather } from "@expo/vector-icons"; // Icon for the timer
import { router } from "expo-router";
import useOrdersStore from "@/store/orders.store";

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

// --- DEFAULT/FALLBACK DATA ---
const fallbackOrderDetails = {
  id: "#-",
  status: "Pending order",
  time: "- min",
  items: [],
};

const parseItemsSummary = (summary: string) =>
  summary
    .split(", ")
    .map((entry) => {
      const match = entry.match(/^(\d+)x\s+(.*)$/);
      if (match) {
        return { qty: Number(match[1]), name: match[2] };
      }
      return { qty: 1, name: entry };
    })
    .filter((entry) => entry.name.trim().length > 0);

const preparationSteps = ["received", "preparing", "ready"];
const statusTextMap: Record<typeof preparationSteps[number], string> = {
  received: "Your Order Was Received",
  preparing: "Your Order Is Being Prepared",
  ready: "Your Order Is Ready",
};

export default function Index() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_900Black });
  const insets = useSafeAreaInsets();
  const latestOrder = useOrdersStore((state) => state.recentOrders[0]);

  const orderDetails = latestOrder
    ? {
        id: latestOrder.orderNumber.startsWith("#")
          ? latestOrder.orderNumber
          : `#${latestOrder.orderNumber}`,
        status: fallbackOrderDetails.status,
        time: fallbackOrderDetails.time,
        items: parseItemsSummary(latestOrder.itemsSummary),
      }
    : fallbackOrderDetails;
  const currentStatus = orderDetails.status;
  const statusText =
    preparationSteps.includes(currentStatus as (typeof preparationSteps)[number])
      ? statusTextMap[currentStatus as (typeof preparationSteps)[number]]
      : "Pending order";
      const progressPct = preparationSteps.includes(currentStatus as (typeof preparationSteps)[number])
    ? ((preparationSteps.indexOf(currentStatus as (typeof preparationSteps)[number]) + 1) /
        preparationSteps.length) *
      100
    : 0;

  if (!fontsLoaded) return null;

  return (
    <View className="flex-1 bg-gray-50">
      <View 
        className="absolute w-[200%] h-[100%] bg-gray-50 rounded-full -left-[50%]" 
        style={{ top: HEADER_HEIGHT + insets.top }} 
      />

      {/* =================================================
          LAYER 2: TITLE (Eureka)
      ================================================= */}
      <View 
        className="absolute top-0 left-0 right-0 items-center justify-center z-0"
        style={{ height: HEADER_HEIGHT, top: insets.top }}
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
      <SafeAreaView className="flex-1" edges={['bottom', 'top']}>
        <ScrollView 
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: HEADER_HEIGHT + insets.top - 60,
          }}
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
                {statusText}
              </Text>
            </View>

            {/* CARD BODY (Items) */}
            <View className="p-6 bg-white">
              {orderDetails.items.length === 0 ? (
                <View className="flex-row items-center mb-3">
                  <Text className="text-gray-800 text-lg font-medium">-</Text>
                </View>
              ) : (
                orderDetails.items.map((item, index) => (
                  <View key={index} className="flex-row items-center mb-3">
                    <Text className="text-gray-800 text-lg font-medium">
                      {item.qty}x  {item.name}
                    </Text>
                  </View>
                ))
              )}

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
                      received = 33%, preparing = 66%, ready = 100%
                   */}
                  <View
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${Math.max(0, progressPct)}%` }}
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
