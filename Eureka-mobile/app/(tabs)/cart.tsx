// Currently fixed cart page without dynamic data
// TODO:
// Dynamic fetching
// Indication of estimated time taken for preparation according to items in queue and own order
// Redirect to home page for order tracking after successful order placement


// remove promo code text after redeeming, Applied promo should reset when user edits the code



import CartItem from "@/components/CartItem";
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import { placeOrder, validatePromoCode } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import type { PaymentInfoSummaryProps, CartFooterProps } from "@/type";
import cn from "clsx";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


// Reusable card wrapper for cart sections with consistent padding/border styles.
const SectionCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <View className={cn("border border-gray-200 p-5 rounded-2xl", className)}>
    {children}
  </View>
);

// Renders a single label/value row for the payment summary list.
const PaymentSummaryRow = ({
  label,
  value,
  labelStyle,
  valueStyle,
}: PaymentInfoSummaryProps) => (
  <View className="flex-between flex-row my-1">
    <Text className={cn("paragraph-medium text-gray-200", labelStyle)}>
      {label}
    </Text>
    <Text className={cn("paragraph-bold text-dark-100", valueStyle)}>
      {value}
    </Text>
  </View>
);

// Handles promo code input and apply action UI.
const PromoCodeSection = ({
  promoCode,
  setPromoCode,
  onApply,
  isApplying,
  appliedCode,
}: {
  promoCode: string;
  setPromoCode: (value: string) => void;
  onApply: () => void;
  isApplying: boolean;
  appliedCode?: string | null;
}) => {
  const hasCode = promoCode.trim().length > 0;

  return (
    <SectionCard className="bg-white">
      <Text className="h3-bold text-dark-100 mb-4">Promo Code</Text>
      <View className="flex-row items-center gap-4">
        <TextInput
          className="flex-1 rounded-full bg-slate-50 px-5 py-2.5 text-base leading-5"
          placeholder="Enter promo code here"
          placeholderTextColor="#B8BCC5"
          value={promoCode}
          onChangeText={setPromoCode}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={onApply}
          className={cn(
            "rounded-full px-6 py-3",
            hasCode ? "bg-primary" : "bg-gray-300"
          )}
          activeOpacity={0.85}
          disabled={!hasCode || isApplying}
        >
          <Text className="text-white text-base font-semibold">
            {isApplying ? "Checking..." : "Redeem"}
          </Text>
        </TouchableOpacity>
      </View>
      {appliedCode ? (
        <Text className="text-sm text-green-600 mt-3">
          Applied code: {appliedCode}
        </Text>
      ) : null}
    </SectionCard>
  );
};

// Estimated time display; currently static until back-end queue data is wired.
// TODO: make dynamic based on kitchen load and order queue
const EstimatedTimeCard = ({estimatedTime}: {
estimatedTime: { range: string; note: string };
}) => (
  <SectionCard>
    <Text className="h3-bold text-dark-100 mb-2">Estimated Time</Text>
    <Text className="text-2xl font-bold text-dark-100">
      {estimatedTime.range}
    </Text>
    <Text className="paragraph-regular text-gray-200 mt-1">
      {estimatedTime.note}
    </Text>
  </SectionCard>
);

// Groups payment summary rows (items, promo, totals).
const PaymentSummaryCard = ({
  totalItems,
  subtotalCents,
  discountCents,
  promoCode,
}: {
  totalItems: number;
  subtotalCents: number;
  discountCents: number;
  promoCode?: string | null;
}) => (
  <SectionCard>
    <Text className="h3-bold text-dark-100 mb-5">Payment Summary</Text>
    <PaymentSummaryRow
      label={`Total Items (${totalItems})`}
      value={`$${(subtotalCents / 100).toFixed(2)}`}
    />
    {discountCents > 0 ? (
      <PaymentSummaryRow
        label={`Promo ${promoCode ? `(${promoCode})` : ""}`}
        value={`-$${(discountCents / 100).toFixed(2)}`}
        valueStyle="text-green-600"
      />
    ) : null}
    <View className="border-t border-gray-300 my-2" />
    <PaymentSummaryRow
      label={`Total`}
      value={`$${(Math.max(0, subtotalCents - discountCents) / 100).toFixed(2)}`}
      labelStyle="base-bold !text-dark-100"
      valueStyle="base-bold !text-dark-100 !text-right"
    />
  </SectionCard>
);

// Footer bundle below the item list: ETA, promo, totals, and CTA.
const CartFooter = ({
  totalItems,
  subtotalCents,
  discountCents,
  promoCode,
  estimatedTime,
  isSubmitting,
  onApplyPromo,
  isApplyingPromo,
  setPromoCode,
  promoCodeInput,
  onOrderNow,
}: CartFooterProps) => {
  if (totalItems === 0) return null;

  return (
    <View className="gap-5">
      <EstimatedTimeCard estimatedTime={estimatedTime} />
      <PromoCodeSection
        promoCode={promoCodeInput}
        setPromoCode={setPromoCode}
        onApply={onApplyPromo}
        isApplying={isApplyingPromo}
        appliedCode={promoCode}
      />
      <PaymentSummaryCard
        totalItems={totalItems}
        subtotalCents={subtotalCents}
        discountCents={discountCents}
        promoCode={promoCode}
      />
      <CustomButton
        title="Order Now"
        isLoading={isSubmitting}
        onPress={onOrderNow}
      />
    </View>
  );
};

// Main Cart screen: shows items, pricing, and checkout controls.
const Cart = () => {
  const items = useCartStore((state) => state.items);

  const { clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    promoId: string;
    codeUpper: string;
    discountCents: number;
  } | null>(null);

  // Update promo code input and reset applied promo when edited after redeeming.
  const handlePromoCodeChange = (value: string) => {
    setPromoCode(value);
    if (appliedPromo) {
      setAppliedPromo(null);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalCents = items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0
  );
  const discountCents = appliedPromo?.discountCents ?? 0;

  // useEffect autoupdates when values it watches change i.e [appliedPromo, subtotalCents, user?.id]
  // Auto updates promo discount amt when cart subtotal changes.
  useEffect(() => {
    if (!appliedPromo) return;
    if (!user?.id || subtotalCents <= 0) {
      setAppliedPromo(null);
      return;
    }

    let isActive = true;
    (async () => {
      try {
        const refreshed = await validatePromoCode({
          code: appliedPromo.codeUpper,
          userId: user.id,
          subtotalCents,
        });
        if (isActive) {
          setAppliedPromo(refreshed);
        }
      } catch {
        if (isActive) {
          setAppliedPromo(null);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [appliedPromo, subtotalCents, user?.id]);

  // Validate and apply a promo code for the current user and subtotal.
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      Alert.alert("Promo code", "Please enter a code.");
      return;
    }
    if (!user?.id) {
      Alert.alert("Please sign in", "Sign in to redeem a promo code.");
      return;
    }

    setIsApplyingPromo(true);
    try {
      // Validate promo code, throws if invalid
      // returns { promoId, code, discount in cents } that is validated
      const result = await validatePromoCode({ 
        code: promoCode,
        userId: user.id,
        subtotalCents,
      });

      // Apply the validated promo
      setPromoCode(result.codeUpper); 
      setAppliedPromo(result);
      Alert.alert("Promo code", `Code applied: ${result.codeUpper}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to validate promo code.";
      Alert.alert("Promo code", message);
      setAppliedPromo(null);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // Mock estimated time data
  const estimatedTime = {
    range: "20-30 min",
    note: "Based on current kitchen load",
  };

  // Place order and optionally re-validate promo before submission.
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
    //TODO: ensure prepayment success before order creation
    setIsSubmitting(true);
    try {
      let discountToApplyCents = discountCents;
      if (appliedPromo) {
        const refreshed = await validatePromoCode({ // re-validate before order placement
          code: appliedPromo.codeUpper,
          userId,
          subtotalCents,
        });
        discountToApplyCents = refreshed.discountCents;
        if (refreshed.discountCents !== appliedPromo.discountCents) {
          setAppliedPromo(refreshed);
        }
      }

      const orderDoc = await placeOrder({
        userId,
        items,
        total: Math.max(0, subtotalCents - discountToApplyCents) / 100,
        promo: appliedPromo
          ? {
              promoId: appliedPromo.promoId,
              promoCode: appliedPromo.codeUpper,
              discountCents: discountToApplyCents,
            }
          : undefined,
      });

      // TODO: Ensure successful order placement and payment
      clearCart();
      Alert.alert("Order placed", `Your order number is ${orderDoc.orderNumber}.`);

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
        ListHeaderComponent={() => (
          <CustomHeader title="Your Cart" backHref="/search" />
        )}
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
        ListFooterComponent={
          <CartFooter
            totalItems={totalItems}
            subtotalCents={subtotalCents}
            discountCents={discountCents}
            promoCode={appliedPromo?.codeUpper}
            estimatedTime={estimatedTime}
            isSubmitting={isSubmitting}
            onApplyPromo={handleApplyPromo}
            isApplyingPromo={isApplyingPromo}
            setPromoCode={handlePromoCodeChange}
            promoCodeInput={promoCode}
            onOrderNow={handleOrderNow}
          />
        }
      />
    </SafeAreaView>
  );
};

export default Cart;
