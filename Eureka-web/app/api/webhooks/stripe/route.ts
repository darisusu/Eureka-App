import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
    const payload = await req.text();
    const sig = req.headers.get("stripe-signature") ?? "";

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            payload,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error("[stripe-webhook] signature verification failed:", err);
        return NextResponse.json({ ok: false, message: "Invalid signature." }, { status: 400 });
    }

    if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as Stripe.PaymentIntent;

        const { data: order, error } = await supabase
            .from("orders")
            .select("id, user_id, is_paid, status, promo_id, discount_cents")
            .eq("payment_intent_id", pi.id)
            .maybeSingle();

        if (error || !order) {
            return NextResponse.json({ ok: false, message: "Order not found." }, { status: 200 });
        }

        if (!order.is_paid) {
            await supabase
                .from("orders")
                .update({ is_paid: true, status: "received" })
                .eq("id", order.id);

            if (order.promo_id) {
                const { count } = await supabase
                    .from("promo_redemptions")
                    .select("id", { count: "exact", head: true })
                    .eq("order_id", order.id);

                if ((count ?? 0) === 0) {
                    await supabase.from("promo_redemptions").insert({
                        promo_id: order.promo_id,
                        user_id: order.user_id,
                        order_id: order.id,
                        discount_cents: order.discount_cents,
                    });
                }
            }
        }
    }

    if (event.type === "payment_intent.payment_failed") {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn("[stripe-webhook] payment failed:", pi.id, pi.last_payment_error?.message);
    }

    return NextResponse.json({ ok: true });
}
