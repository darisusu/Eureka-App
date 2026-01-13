import { useCartStore } from "@/store/cart.store";
import { router } from "expo-router";
import React from "react";
import { Platform, Text, TouchableOpacity } from "react-native";

export const CHECKOUT_BAR_HEIGHT = 56;

const CheckoutBar = ({ bottomOffset = 0 }: { bottomOffset?: number }) => {
  const items = useCartStore((state) => state.items);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  if (totalItems === 0) return null;

  return (
    <TouchableOpacity
      onPress={() => router.push("/cart")}
      activeOpacity={0.9}
      className="bg-primary rounded-2xl px-4 py-3 flex-row items-center justify-between"
      style={
        Platform.OS === "android"
          ? {
              position: "absolute",
              left: 16,
              right: 16,
              bottom: bottomOffset,
              minHeight: CHECKOUT_BAR_HEIGHT,
              elevation: 8,
            }
          : {
              position: "absolute",
              left: 16,
              right: 16,
              bottom: bottomOffset,
              minHeight: CHECKOUT_BAR_HEIGHT,
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }
      }
    >
      <Text className="paragraph-bold text-white">
        {totalItems} {totalItems === 1 ? "item" : "items"}
      </Text>
      <Text className="paragraph-bold text-white">
        ${totalPrice.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
};

export default CheckoutBar;
