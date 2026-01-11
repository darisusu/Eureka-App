// Currently fixed cart page without dynamic data
// TODO:
// Dynamic fetching
// Indication of estimated time taken for preparation according to items in queue and own order
// Redirect to home page for order tracking after successful order placement


import CartItem from "@/components/CartItem";
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import { useCartStore } from "@/store/cart.store";
import type { PaymentInfoStripeProps } from "@/type";
import cn from "clsx";
import React from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PaymentInfoStripe = ({
  label,
  value,
  labelStyle,
  valueStyle,
}: PaymentInfoStripeProps) => (
  <View className="flex-between flex-row my-1">
    <Text className={cn("paragraph-medium text-gray-200", labelStyle)}>
      {label}
    </Text>
    <Text className={cn("paragraph-bold text-dark-100", valueStyle)}>
      {value}
    </Text>
  </View>
);
const Cart = () => {
  // const { items, getTotalItems, getTotalPrice } = useCartStore();
  // const totalItems = getTotalItems();
  // const totalPrice = getTotalPrice();
  const items = useCartStore((s) => s.items);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const estimatedTime = {
    range: "20-30 min",
    note: "Based on current kitchen load",
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <FlatList
        data={items}
        renderItem={({ item }) => <CartItem item={item} />}
        keyExtractor={(item) =>
          `${item.id}:${item.specialRequest ?? ""}`
        }
        contentContainerClassName="pb28 px-5 pt-5"
        ListHeaderComponent={() => <CustomHeader title="Your Cart" />}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center">
            <View className = "p-5"><Text className="text-4xl">🛒</Text></View>
            <Text className="h3-bold text-dark-100">Your cart is empty</Text>
            <Text className="paragraph-regular text-gray-200 text-center mt-2">
              Looks like you haven't added{"\n"}any food to your cart yet.
            </Text>
          </View>
        )}
        ListFooterComponent={() =>
          totalItems > 0 && (
            <View className="gap-5">
              <View className="border border-gray-200 p-5 rounded-2xl">
                <Text className="h3-bold text-dark-100 mb-2">
                  Estimated Time
                </Text>
                <Text className="text-2xl font-bold text-dark-100">
                  {estimatedTime.range}
                </Text>
                <Text className="paragraph-regular text-gray-200 mt-1">
                  {estimatedTime.note}
                </Text>
              </View>
              <View className="mt-6 border border-gray-200 p-5 rounded-2xl">
                <Text className="h3-bold text-dark-100 mb-5">
                  Payment Summary
                </Text>

                <PaymentInfoStripe
                  label={`Total Items (${totalItems})`}
                  value={`$${totalPrice.toFixed(2)}`}
                />

                <View className="border-t border-gray-300 my-2" />
                <PaymentInfoStripe
                  label={`Total`}
                  value={`$${totalPrice.toFixed(2)}`}
                  labelStyle="base-bold !text-dark-100"
                  valueStyle="base-bold !text-dark-100 !text-right"
                />
              </View>
              <CustomButton title="Order Now" />
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

export default Cart;
