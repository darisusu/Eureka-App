// Currently fixed cart page without dynamic data
// TODO:
// Dynamic fetching
// Indication of estimated time taken for preparation according to items in queue and own order
// Redirect to home page for order tracking after successful order placement



import CartItem from "@/components/CartItem";
import CustomButton from "@/components/CustomButton";
import CustomHeader from "@/components/CustomHeader";
import { calculateCartTotals, confirmCheckoutPayment, createCheckout } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import useOrdersStore from "@/store/orders.store";
import type { PaymentInfoSummaryProps, CartFooterProps } from "@/type";
import { useStripe } from "@stripe/stripe-react-native";
import cn from "clsx";
import * as Linking from "expo-linking";
import { router } from "expo-router";
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
  const addRecentOrder = useOrdersStore((state) => state.addRecentOrder);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    promoId: string;
    codeUpper: string;
    discountCents: number;
  } | null>(null);

  // Pricing state: subtotal, discount, total in cents.
  const [pricing, setPricing] = useState({
    subtotalCents: 0,
    discountCents: 0,
    totalCents: 0,
  });
  const [hasServerTotals, setHasServerTotals] = useState(false);


  // Updates pricing state: subtotal, discount, total based on current cart & promo.
  // Calls backend to validate promo and compute totals. (calculateCartTotals)
  const refreshTotals = async (options?: {
    promoCode?: string | null;
    showError?: boolean;
  }) => {
    const promoOverride = options?.promoCode;

    // Empty cart: reset pricing and promo.
    if (items.length === 0) {
      setPricing({ subtotalCents: 0, discountCents: 0, totalCents: 0 });
      setAppliedPromo(null);
      setHasServerTotals(false);
      return null;
    }

    setHasServerTotals(false);
    try {
      // Call backend to calculate total 
      const result = await calculateCartTotals({
        userId: user?.id,
        items,
        promoCode:
          promoOverride !== undefined ? promoOverride : appliedPromo?.codeUpper,
      });
      // Update pricing state
      setPricing({
        subtotalCents: result.subtotalCents,
        discountCents: result.discountCents,
        totalCents: result.totalCents,
      });
      setAppliedPromo(result.promo); // Update server promo: {promoId, codeUpper, discountCents}
      if (result.promo?.codeUpper) {
        setPromoCode(result.promo.codeUpper); // Update user input to what was accepted (e.g casing, trimming)
      }
      setHasServerTotals(true);
      return result;

    // On error, reset promo and pricing; optionally re-throw error.
    } catch (error: unknown) {
      setAppliedPromo(null);
      setPricing((prev) => ({
        subtotalCents: prev.subtotalCents,
        discountCents: 0,
        totalCents: prev.subtotalCents,
      }));
      setHasServerTotals(false);

      if (options?.showError) {
        throw error;
      }
      return null;
    }
  };

  // Update promo code input and reset applied promo when edited after redeeming.
  const handlePromoCodeChange = (value: string) => {
    setPromoCode(value);
    if (appliedPromo) {
      setAppliedPromo(null);
      void refreshTotals({ promoCode: null });
    }
  };
  

  // UI totals: use local subtotal immediately, then swap to server-validated totals.
  const localSubtotalCents = items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0
  );
  const subtotalCents = hasServerTotals ? pricing.subtotalCents : localSubtotalCents;
  const discountCents = hasServerTotals ? pricing.discountCents : 0;
  const promoCodeForUI = hasServerTotals ? appliedPromo?.codeUpper : null;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);


  // Recompute totals whenever cart items or user changes (i.e dependencies)
  useEffect(() => {
    void refreshTotals();
  }, [items, user?.id]);

  // Validate and apply a promo code for the current user and subtotal.
  const handleApplyPromo = async () => {
    if (totalItems === 0) {
      Alert.alert("Promo code", "Add items to your cart first.");
      return;
    }
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
      const result = await refreshTotals({ promoCode, showError: true });
      if (result?.promo?.codeUpper) {
        Alert.alert("Promo code", `Code applied: ${result.promo.codeUpper}`);
      } else {
        Alert.alert("Promo code", "Code applied.");
      }
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

  const formatDateLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-SG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const buildOrderEntry = ({
    orderId,
    orderNumber,
    totalCents,
  }: {
    orderId: string;
    orderNumber: string;
    totalCents: number;
  }) => ({
    orderId,
    orderNumber,
    dateLabel: formatDateLabel(new Date().toISOString()),
    total: totalCents / 100,
    status: "received" as const,
    itemsSummary: items.length
      ? items.map((item) => `${item.quantity}x ${item.name}`).join(", ")
      : "Items unavailable",
  });

  // Create checkout, present Stripe payment sheet, and confirm payment on the server.
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
    setIsSubmitting(true);
    try {
      const checkout = await createCheckout({
        userId,
        items,
        promoCode: appliedPromo?.codeUpper,
        customerEmail: user?.email,
      });
      setPricing({
        subtotalCents: checkout.subtotalCents,
        discountCents: checkout.discountCents,
        totalCents: checkout.totalCents,
      });
      setAppliedPromo(checkout.promo);
      setHasServerTotals(true);

      if (!checkout.paymentRequired) {
        const newOrder = buildOrderEntry({
          orderId: checkout.orderId,
          orderNumber: checkout.orderNumber,
          totalCents: checkout.totalCents,
        });
        clearCart();
        addRecentOrder(newOrder);
        Alert.alert("Order placed", `Your order number is ${checkout.orderNumber}.`, [
          { text: "OK", onPress: () => router.replace("/") },
        ]);
        return;
      }

      if (!checkout.clientSecret || !checkout.paymentIntentId) {
        throw new Error("Missing payment intent details.");
      }

      // Prepare the Stripe PaymentSheet using the server-generated client secret.
      const initResult = await initPaymentSheet({
        merchantDisplayName: "Eureka",
        paymentIntentClientSecret: checkout.clientSecret,
        returnURL: Linking.createURL("stripe-redirect"),
      });

      if (initResult.error) {
        throw new Error(initResult.error.message);
      }

      const presentResult = await presentPaymentSheet();
      if (presentResult.error) {
        if (presentResult.error.code === "Canceled") {
          Alert.alert("Payment canceled", "You can retry checkout any time.");
          return;
        }
        throw new Error(presentResult.error.message);
      }

      // Confirm payment on the server to update order status to received.
      const confirmation = await confirmCheckoutPayment({
        userId,
        orderId: checkout.orderId,
        paymentIntentId: checkout.paymentIntentId,
      });

      if (!confirmation.isPaid) {
        throw new Error("Payment verification failed.");
      }

      const newOrder = buildOrderEntry({
        orderId: checkout.orderId,
        orderNumber: checkout.orderNumber,
        totalCents: checkout.totalCents,
      });
      clearCart();
      addRecentOrder(newOrder);
      Alert.alert("Payment successful", `Your order number is ${checkout.orderNumber}.`, [
        { text: "OK", onPress: () => router.replace("/") },
      ]);

    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to complete checkout.";
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
            promoCode={promoCodeForUI}
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
