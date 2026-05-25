"use client";

import { confirmCheckoutPayment } from "@/lib/supabase";
import useAuthStore from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import useOrdersStore from "@/store/orders.store";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";

function StripeRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { clearCart, items } = useCartStore();
  const addRecentOrder = useOrdersStore((state) => state.addRecentOrder);
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const paymentIntent = searchParams.get("payment_intent");
    const orderId = searchParams.get("order_id");
    const redirectStatus = searchParams.get("redirect_status");

    if (redirectStatus !== "succeeded" || !paymentIntent || !orderId) {
      setStatus("error");
      setErrorMsg("Payment verification failed. Please contact staff with your order reference.");
      return;
    }

    const orderNumber = searchParams.get("order_number") ?? orderId;

    const confirm = async () => {
      try {
        const confirmation = await confirmCheckoutPayment({
          userId: user?.id ?? "",
          orderId,
          paymentIntentId: paymentIntent,
        });

        addRecentOrder({
          orderId,
          orderNumber,
          dateLabel: new Date().toLocaleDateString("en-SG", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          total: 0,
          status: "received",
          itemsSummary: items.length
            ? items.map((i) => `${i.quantity}x ${i.name}`).join(", ")
            : "Items unavailable",
          readyAt: confirmation.readyAt,
        });
      } catch {
        // Server confirmation failed (e.g. transient error), but Stripe already
        // captured the payment (redirect_status=succeeded is authoritative).
        // Add a placeholder order entry so the customer can reference it.
        addRecentOrder({
          orderId,
          orderNumber,
          dateLabel: new Date().toLocaleDateString("en-SG", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          total: 0,
          status: "received",
          itemsSummary: "Items unavailable",
        });
      } finally {
        // Always clear the cart — Stripe has charged the customer.
        clearCart();
        setStatus("success");
        setTimeout(() => router.replace("/"), 1500);
      }
    };

    void confirm();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
      {status === "processing" && (
        <>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="paragraph-semibold text-dark-100">Confirming your payment...</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="text-5xl">✅</div>
          <p className="paragraph-semibold text-dark-100">Payment confirmed! Redirecting...</p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="text-5xl">❌</div>
          <p className="paragraph-semibold text-dark-100">{errorMsg}</p>
          <Link
            href="/search"
            className="bg-primary text-white rounded-full px-6 py-3 font-bold"
          >
            Back to cart
          </Link>
        </>
      )}
    </div>
  );
}

export default function StripeRedirect() {
  return (
    <Suspense>
      <StripeRedirectInner />
    </Suspense>
  );
}
