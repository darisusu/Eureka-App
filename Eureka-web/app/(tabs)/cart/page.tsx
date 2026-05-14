"use client";

import CartItem from "@/components/CartItem";
import CustomButton from "@/components/CustomButton";
import { calculateCartTotals, createCheckout } from "@/lib/supabase";
import useAuthStore from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import useOrdersStore from "@/store/orders.store";
import type { CartFooterProps, PaymentInfoSummaryProps, EstimatedTime } from "@/type";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import cn from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShoppingCart } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const SectionCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("border border-gray-200 p-5 rounded-2xl", className)}>
    {children}
  </div>
);

const PaymentSummaryRow = ({
  label,
  value,
  labelStyle,
  valueStyle,
}: PaymentInfoSummaryProps) => (
  <div className="flex justify-between items-center my-1">
    <span className={cn("paragraph-medium text-gray-200", labelStyle)}>
      {label}
    </span>
    <span className={cn("paragraph-bold text-dark-100", valueStyle)}>
      {value}
    </span>
  </div>
);

const EstimatedTimeCard = ({ estimatedTime }: { estimatedTime: EstimatedTime }) => (
  <SectionCard>
    <h3 className="h3-bold text-dark-100 mb-2">Estimated Time</h3>
    <p className="text-2xl font-bold text-dark-100">{estimatedTime.range}</p>
    <p className="paragraph-regular text-gray-200 mt-1">{estimatedTime.note}</p>
  </SectionCard>
);

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
    <h3 className="h3-bold text-dark-100 mb-5">Payment Summary</h3>
    <PaymentSummaryRow
      label={`Total Items (${totalItems})`}
      value={`$${(subtotalCents / 100).toFixed(2)}`}
    />
    {discountCents > 0 && (
      <PaymentSummaryRow
        label={`Promo ${promoCode ? `(${promoCode})` : ""}`}
        value={`-$${(discountCents / 100).toFixed(2)}`}
        valueStyle="text-green-600"
      />
    )}
    <div className="border-t border-gray-300 my-2" />
    <PaymentSummaryRow
      label="Total"
      value={`$${(Math.max(0, subtotalCents - discountCents) / 100).toFixed(2)}`}
      labelStyle="base-bold !text-dark-100"
      valueStyle="base-bold !text-dark-100 text-right"
    />
  </SectionCard>
);

// Stripe checkout form rendered inside <Elements>
function CheckoutForm({
  orderId,
  orderNumber,
  totalCents,
  onSuccess,
  onCancel,
}: {
  orderId: string;
  orderNumber: string;
  totalCents: number;
  onSuccess: (orderId: string, orderNumber: string, totalCents: number) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const returnUrl = `${window.location.origin}/stripe-redirect?order_id=${orderId}&order_number=${encodeURIComponent(orderNumber)}`;
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      });

      if (error) {
        if (error.type !== "validation_error") {
          toast.error(error.message ?? "Payment failed.");
        }
      }
      // On success, Stripe redirects to return_url
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      <CustomButton
        type="submit"
        title="Pay Now"
        isLoading={isProcessing}
        disabled={!stripe || !elements}
      />
      <button
        type="button"
        onClick={onCancel}
        className="text-gray-500 text-sm text-center hover:underline"
      >
        Cancel
      </button>
    </form>
  );
}

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

  const hasCode = promoCodeInput.trim().length > 0;

  return (
    <div className="flex flex-col gap-5">
      <EstimatedTimeCard estimatedTime={estimatedTime} />

      <SectionCard className="bg-white">
        <h3 className="h3-bold text-dark-100 mb-4">Promo Code</h3>
        <div className="flex items-center gap-4">
          <input
            className="flex-1 rounded-full bg-slate-50 px-5 py-2.5 text-base outline-none border border-transparent focus:border-primary"
            placeholder="Enter promo code here"
            value={promoCodeInput}
            onChange={(e) => setPromoCode(e.target.value)}
            autoComplete="off"
          />
          <button
            onClick={onApplyPromo}
            disabled={!hasCode || isApplyingPromo}
            className={cn(
              "rounded-full px-6 py-3 text-white text-base font-semibold transition-opacity",
              hasCode ? "bg-primary" : "bg-gray-300 cursor-not-allowed"
            )}
          >
            {isApplyingPromo ? "Checking..." : "Redeem"}
          </button>
        </div>
        {promoCode && (
          <p className="text-sm text-green-600 mt-3">Applied code: {promoCode}</p>
        )}
      </SectionCard>

      <PaymentSummaryCard
        totalItems={totalItems}
        subtotalCents={subtotalCents}
        discountCents={discountCents}
        promoCode={promoCode}
      />

      <CustomButton
        title="Order Now"
        isLoading={isSubmitting}
        onClick={onOrderNow}
      />
    </div>
  );
};

export default function Cart() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const { clearCart } = useCartStore();
  const { user } = useAuthStore();
  const addRecentOrder = useOrdersStore((state) => state.addRecentOrder);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    promoId: string;
    codeUpper: string;
    discountCents: number;
  } | null>(null);
  const [pricing, setPricing] = useState({
    subtotalCents: 0,
    discountCents: 0,
    totalCents: 0,
  });
  const [hasServerTotals, setHasServerTotals] = useState(false);

  // Stripe checkout state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{
    orderId: string;
    orderNumber: string;
    totalCents: number;
  } | null>(null);

  const refreshTotals = async (options?: {
    promoCode?: string | null;
    showError?: boolean;
  }) => {
    const promoOverride = options?.promoCode;

    if (items.length === 0) {
      setPricing({ subtotalCents: 0, discountCents: 0, totalCents: 0 });
      setAppliedPromo(null);
      setHasServerTotals(false);
      return null;
    }

    setHasServerTotals(false);
    try {
      const result = await calculateCartTotals({
        userId: user?.id,
        items,
        promoCode:
          promoOverride !== undefined ? promoOverride : appliedPromo?.codeUpper,
      });
      setPricing({
        subtotalCents: result.subtotalCents,
        discountCents: result.discountCents,
        totalCents: result.totalCents,
      });
      setAppliedPromo(result.promo);
      if (result.promo?.codeUpper) setPromoCodeInput(result.promo.codeUpper);
      setHasServerTotals(true);
      return result;
    } catch (error: unknown) {
      setAppliedPromo(null);
      setPricing((prev) => ({
        subtotalCents: prev.subtotalCents,
        discountCents: 0,
        totalCents: prev.subtotalCents,
      }));
      setHasServerTotals(false);
      if (options?.showError) throw error;
      return null;
    }
  };

  const handlePromoCodeChange = (value: string) => {
    setPromoCodeInput(value);
    if (appliedPromo) {
      setAppliedPromo(null);
      void refreshTotals({ promoCode: null });
    }
  };

  const localSubtotalCents = items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0
  );
  const subtotalCents = hasServerTotals ? pricing.subtotalCents : localSubtotalCents;
  const discountCents = hasServerTotals ? pricing.discountCents : 0;
  const promoCodeForUI = hasServerTotals ? appliedPromo?.codeUpper : null;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    void refreshTotals();
  }, [items, user?.id]);

  const handleApplyPromo = async () => {
    if (totalItems === 0) {
      toast.error("Add items to your cart first.");
      return;
    }
    if (!promoCodeInput.trim()) {
      toast.error("Please enter a code.");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in to redeem a promo code.");
      return;
    }

    setIsApplyingPromo(true);
    try {
      const result = await refreshTotals({ promoCode: promoCodeInput, showError: true });
      if (result?.promo?.codeUpper) {
        toast.success(`Code applied: ${result.promo.codeUpper}`);
      } else {
        toast.success("Code applied.");
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to validate promo code."
      );
      setAppliedPromo(null);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const formatDateLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-SG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handleOrderNow = async () => {
    if (!user?.id) {
      toast.error("You need to be signed in to place an order.");
      return;
    }
    if (totalItems === 0) {
      toast.error("Add items before placing an order.");
      return;
    }

    setIsSubmitting(true);
    try {
      const checkout = await createCheckout({
        userId: user.id,
        items,
        promoCode: appliedPromo?.codeUpper,
      });

      setPricing({
        subtotalCents: checkout.subtotalCents,
        discountCents: checkout.discountCents,
        totalCents: checkout.totalCents,
      });
      setAppliedPromo(checkout.promo);
      setHasServerTotals(true);

      if (!checkout.paymentRequired) {
        addRecentOrder({
          orderId: checkout.orderId,
          orderNumber: checkout.orderNumber,
          dateLabel: formatDateLabel(new Date().toISOString()),
          total: checkout.totalCents / 100,
          status: "received",
          itemsSummary: items.length
            ? items.map((i) => `${i.quantity}x ${i.name}`).join(", ")
            : "Items unavailable",
        });
        clearCart();
        toast.success(`Order placed! Your order number is ${checkout.orderNumber}.`);
        router.replace("/");
        return;
      }

      if (!checkout.clientSecret || !checkout.paymentIntentId) {
        throw new Error("Missing payment intent details.");
      }

      setClientSecret(checkout.clientSecret);
      setPendingCheckout({
        orderId: checkout.orderId,
        orderNumber: checkout.orderNumber,
        totalCents: checkout.totalCents,
      });
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to complete checkout."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (
    orderId: string,
    orderNumber: string,
    totalCents: number
  ) => {
    addRecentOrder({
      orderId,
      orderNumber,
      dateLabel: formatDateLabel(new Date().toISOString()),
      total: totalCents / 100,
      status: "received",
      itemsSummary: items.length
        ? items.map((i) => `${i.quantity}x ${i.name}`).join(", ")
        : "Items unavailable",
    });
    clearCart();
    setClientSecret(null);
    setPendingCheckout(null);
    toast.success(`Payment successful! Order ${orderNumber} placed.`);
    router.replace("/");
  };

  const estimatedTime: EstimatedTime = {
    range: "20-30 min",
    note: "Based on current kitchen load",
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Stripe checkout modal */}
      {clientSecret && pendingCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="h3-bold text-dark-100 mb-4">Complete Payment</h2>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                orderId={pendingCheckout.orderId}
                orderNumber={pendingCheckout.orderNumber}
                totalCents={pendingCheckout.totalCents}
                onSuccess={handlePaymentSuccess}
                onCancel={() => {
                  setClientSecret(null);
                  setPendingCheckout(null);
                }}
              />
            </Elements>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-5 pt-5 pb-32">
        <div className="custom-header">
          <Link href="/search" className="text-dark-100 font-bold text-lg">
            ← Menu
          </Link>
          <h1 className="h3-bold text-dark-100">Your Cart</h1>
          <div className="w-12" />
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <ShoppingCart size={64} className="text-gray-300" />
            <h2 className="h3-bold text-dark-100">Your cart is empty</h2>
            <p className="paragraph-regular text-gray-200 text-center">
              Looks like you haven&apos;t added any food to your cart yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <CartItem
                key={`${item.id}:${item.specialRequest ?? ""}`}
                item={item}
              />
            ))}
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
              promoCodeInput={promoCodeInput}
              onOrderNow={handleOrderNow}
            />
          </div>
        )}
      </div>
    </div>
  );
}
