// Currently fixed cart page without dynamic data
// TODO:
// Dynamic fetching
// Indication of estimated time taken for preparation according to items in queue and own order
// Redirect to home page for order tracking after successful order placement


import CartItem from "@/components/CartItem";
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import { createOrder, createOrderItem } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import type { PaymentInfoStripeProps } from "@/type";
import cn from "clsx";
import React, { useState } from "react";
import { Alert, FlatList, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Payment Summary component
const PaymentSummaryRow = ({
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
  const items = useCartStore((state) => state.items); 

  const { clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.price,0);
  
  // Mock estimated time data
  const estimatedTime = {
    range: "20-30 min",
    note: "Based on current kitchen load",
  };

  const handleOrderNow = async () => {
    const userId = user?.id;
    if (!userId) {
      Alert.alert("Please sign in", "You need to be signed in to place an order.");
      return;
    }
    if (totalItems === 0) {
      Alert.alert("Empty cart", "Add items before placing an order.");
      return;
    }

    //TODO: move order creation logic to lib/appwrite.ts
    //TODO: ensure prepayment success before order creation
    setIsSubmitting(true);
    try {
      const orderNumber = `E${Date.now()}`; // TODO: Better order number generation, server side
      const orderDoc = await createOrder({
        userId,
        status: "received",
        isPaid: false,
        total: totalPrice,
        orderNumber,
      });

      // Create order items
      await Promise.all(
        items.map((item) =>
          createOrderItem({
            orderId: orderDoc.$id,
            menuId: item.id,
            name: item.name,
            price: item.price,
            qty: item.quantity,
            specialRequest: item.specialRequest?.trim() || undefined,
          })
        )
      );

      clearCart();
      Alert.alert("Order placed", `Your order number is ${orderNumber}.`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to place order.";
      Alert.alert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <FlatList
        data={items}
        renderItem={({ item }) => <CartItem item={item} />}
        keyExtractor={(item) =>
          `${item.id}:${item.specialRequest ?? ""}`
        }
        contentContainerClassName="pb-32 px-5 pt-5"
        ListHeaderComponent={() => <CustomHeader title="Your Cart" />}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center">
            <View className="pt-2 pb-1">
              <Image
                source={require("../../assets/mascots/Fish-Sleep.png")}
                className="w-64 h-64"
                resizeMode="contain"
              />
            </View>
            <Text className="h3-bold text-dark-100 -mt-16">
              Your cart is empty
            </Text>
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

                <PaymentSummaryRow
                  label={`Total Items (${totalItems})`}
                  value={`$${totalPrice.toFixed(2)}`}
                />

                <View className="border-t border-gray-300 my-2" />
                <PaymentSummaryRow
                  label={`Total`}
                  value={`$${totalPrice.toFixed(2)}`}
                  labelStyle="base-bold !text-dark-100"
                  valueStyle="base-bold !text-dark-100 !text-right"
                />
              </View>
              <CustomButton
                title="Order Now"
                isLoading={isSubmitting}
                onPress={handleOrderNow}
              />
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

export default Cart;
