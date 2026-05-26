"use client";

import CartItem from "@/components/CartItem";
import CustomButton from "@/components/CustomButton";
import { CATEGORY_ITEM_LIMIT, CATEGORY_ITEM_LIMIT_NAMES } from "@/lib/config";
import { calculateCartTotals, confirmCheckoutPayment, createCheckout, getCategories } from "@/lib/supabase";
import { isCategoryAvailable } from "@/lib/time";
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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import fishSleep from "@/assets/mascots/Fish-Sleep.png";

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

function CheckoutForm({
  orderId,
  orderNumber,
  totalCents,
  onPaymentIntentSuccess,
  onCancel,
}: {
  orderId: string;
  orderNumber: string;
  totalCents: number;
  onPaymentIntentSuccess: (paymentIntentId: string) => Promise<void>;
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
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (error) {
        if (error.type !== "validation_error") {
          toast.error(error.message ?? "Payment failed.");
        }
      } else if (paymentIntent?.status === "succeeded") {
        // Payment confirmed inline (no redirect required — e.g. card payment).
        // Confirm on our backend to mark the order received before showing success.
        await onPaymentIntentSuccess(paymentIntent.id);
      }
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
  isLocked,
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
            className="flex-1 rounded-full bg-slate-50 px-5 py-2.5 text-base outline-none border border-transparent focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter promo code here"
            value={promoCodeInput}
            onChange={(e) => setPromoCode(e.target.value)}
            autoComplete="off"
            disabled={isLocked}
          />
          <button
            onClick={onApplyPromo}
            disabled={!hasCode || isApplyingPromo || isLocked}
            className={cn(
              "rounded-full px-6 py-3 text-white text-base font-semibold transition-opacity disabled:cursor-not-allowed",
              hasCode && !isLocked ? "bg-primary" : "bg-gray-300"
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

export default function CartDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const appliedPromo = useCartStore((state) => state.appliedPromo);
  const { clearCart, setAppliedPromo, purgeCategoryItems } = useCartStore();
  const { user } = useAuthStore();
  const addRecentOrder = useOrdersStore((state) => state.addRecentOrder);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [pricing, setPricing] = useState({
    subtotalCents: 0,
    discountCents: 0,
    totalCents: 0,
  });
  const [hasServerTotals, setHasServerTotals] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<EstimatedTime>({
    range: "20-30 min",
    note: "Based on current kitchen load",
  });

  const restrictedQty = items
    .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName))
    .reduce((sum, i) => sum + i.quantity, 0);
  const hasRestrictedItems = restrictedQty > 0;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{
    orderId: string;
    orderNumber: string;
    totalCents: number;
  } | null>(null);

  // Restore promo input from persisted store (e.g. after payment failure redirect)
  useEffect(() => {
    if (appliedPromo?.codeUpper) {
      setPromoCodeInput(appliedPromo.codeUpper);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // On open, purge any cart items whose category is currently outside its time window
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    getCategories()
      .then((cats) => {
        const unavailableCats = cats.filter(
          (c) => !isCategoryAvailable(c.available_from, c.available_until)
        );
        if (!unavailableCats.length) return;
        const unavailableIds = unavailableCats.map((c) => c.id);
        const affected = items.filter(
          (i) => i.categoryId && unavailableIds.includes(i.categoryId)
        );
        if (!affected.length) return;
        purgeCategoryItems(unavailableIds);
        const names = unavailableCats
          .filter((c) => affected.some((i) => i.categoryId === c.id))
          .map((c) => c.name)
          .join(", ");
        toast(`Some items removed — ${names} is not available right now.`);
      })
      .catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, user?.id]);

  useEffect(() => {
    const categoryIds = [...new Set(items.map((i) => i.categoryId).filter(Boolean))] as string[];
    if (!categoryIds.length) return;
    fetch("/api/estimate-eta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds }),
    })
      .then((r) => r.json())
      .then((res) => {
        console.log("[estimate-eta] response:", res);
        if (res.ok && res.data.minutesFromNow != null) {
          setEstimatedTime({ range: `${res.data.minutesFromNow} min`, note: "Based on current kitchen load" });
        }
      })
      .catch((err) => console.error("[estimate-eta] fetch error:", err));
  }, [items]);

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
          readyAt: checkout.readyAt,
        });
        clearCart();
        onClose();
        toast.success(`Order placed! Your order number is ${checkout.orderNumber}.`);
        router.replace(`/order/${checkout.orderId}`);
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
    totalCents: number,
    readyAt?: string,
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
      readyAt,
    });
    clearCart();
    setClientSecret(null);
    setPendingCheckout(null);
    onClose();
    toast.success(`Payment successful! Order ${orderNumber} placed.`);
    router.replace(`/order/${orderId}`);
  };

  const handlePaymentIntentSuccess = async (paymentIntentId: string) => {
    if (!user?.id || !pendingCheckout) return;
    try {
      const confirmation = await confirmCheckoutPayment({
        userId: user.id,
        orderId: pendingCheckout.orderId,
        paymentIntentId,
      });
      handlePaymentSuccess(
        pendingCheckout.orderId,
        pendingCheckout.orderNumber,
        pendingCheckout.totalCents,
        confirmation.readyAt,
      );
    } catch {
      toast.error("Payment was processed but order confirmation failed. Please contact support.");
    }
  };

  const isLocked = isSubmitting || !!clientSecret;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={isLocked ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="Cart"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <button
            onClick={isLocked ? undefined : onClose}
            disabled={isLocked}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close cart"
          >
            <ArrowLeft size={20} className="text-dark-100" />
          </button>
          <h1 className="h3-bold text-dark-100">Your Cart</h1>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-8">
          {/* Stripe checkout modal (rendered inside drawer) */}
          {clientSecret && pendingCheckout && (
            <div className="fixed inset-0 bg-black/50 z-60 flex items-end md:items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="h3-bold text-dark-100 mb-4">Complete Payment</h2>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm
                    orderId={pendingCheckout.orderId}
                    orderNumber={pendingCheckout.orderNumber}
                    totalCents={pendingCheckout.totalCents}
                    onPaymentIntentSuccess={handlePaymentIntentSuccess}
                    onCancel={() => {
                      setClientSecret(null);
                      setPendingCheckout(null);
                    }}
                  />
                </Elements>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-4 pb-0 gap-0">
              <Image src={fishSleep} alt="Empty cart" width={300} height={300} className="h-auto" />
              <h2 className="h3-bold text-dark-100">Your cart is empty</h2>
              <p className="paragraph-regular text-gray-200 whitespace-nowrap">
                Looks like you haven&apos;t added any food to your cart yet!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {hasRestrictedItems && (
                <div className={`rounded-xl px-4 py-3 mb-2 text-sm ${restrictedQty >= CATEGORY_ITEM_LIMIT ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                  <span className="font-semibold">Fish Soup & Zichar:</span> limited to {CATEGORY_ITEM_LIMIT} items per order ({restrictedQty}/{CATEGORY_ITEM_LIMIT} used)
                </div>
              )}
              {items.map((item) => (
                <CartItem
                  key={`${item.id}:${item.specialRequest ?? ""}`}
                  item={item}
                  isLocked={isLocked}
                />
              ))}
              <CartFooter
                totalItems={totalItems}
                subtotalCents={subtotalCents}
                discountCents={discountCents}
                promoCode={promoCodeForUI}
                estimatedTime={estimatedTime}
                isSubmitting={isSubmitting}
                isLocked={isLocked}
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
    </>
  );
}
