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

const populateDeptSlots = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseClient: any,
    orderId: string,
    categoryIds: string[]
): Promise<string | null> => {
    const slots: { order_id: string; category_id: string; dept_ready_at: string }[] = [];

    for (const categoryId of categoryIds) {
        const { data: readyAt } = await supabaseClient
            .rpc("calculate_dept_ready_at", { p_category_id: categoryId });
        if (readyAt) {
            slots.push({ order_id: orderId, category_id: categoryId, dept_ready_at: readyAt as string });
        }
    }

    if (!slots.length) return null;

    await supabaseClient.from("order_dept_slots").insert(slots);

    const maxReadyAt = slots.reduce(
        (max, s) => (s.dept_ready_at > max ? s.dept_ready_at : max),
        slots[0].dept_ready_at
    );
    await supabaseClient.from("orders").update({ ready_at: maxReadyAt }).eq("id", orderId);
    return maxReadyAt;
};

const normalizeRequest = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const action: string = typeof body.action === "string" ? body.action : "create";

        // ── Confirm path ───────────────────────────────────────────────────────
        if (action === "confirm") {
            const orderId: string = typeof body.orderId === "string" ? body.orderId : "";
            const paymentIntentId: string = typeof body.paymentIntentId === "string" ? body.paymentIntentId : "";
            const userId: string = typeof body.userId === "string" ? body.userId : "";

            if (!orderId || !paymentIntentId) {
                return NextResponse.json({ ok: false, message: "orderId and paymentIntentId are required." }, { status: 400 });
            }

            const { data: order, error: orderErr } = await supabase
                .from("orders")
                .select("id, user_id, is_paid, status, promo_id, discount_cents, payment_intent_id")
                .eq("id", orderId)
                .single();

            if (orderErr || !order) return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
            if (userId && order.user_id !== userId) return NextResponse.json({ ok: false, message: "Order does not belong to this user." }, { status: 403 });
            if (order.payment_intent_id && order.payment_intent_id !== paymentIntentId) {
                return NextResponse.json({ ok: false, message: "Payment intent does not match this order." }, { status: 400 });
            }

            if (order.is_paid) {
                return NextResponse.json({ ok: true, data: { orderId: order.id, status: order.status, isPaid: true } });
            }

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (paymentIntent.status !== "succeeded") {
                return NextResponse.json({ ok: false, message: `Payment not completed. Status: ${paymentIntent.status}` }, { status: 400 });
            }

            await supabase.from("orders").update({ is_paid: true, status: "received" }).eq("id", orderId);

            if (order.promo_id) {
                const { count } = await supabase
                    .from("promo_redemptions")
                    .select("id", { count: "exact", head: true })
                    .eq("order_id", orderId);
                if ((count ?? 0) === 0) {
                    const { error: promoInsertErr } = await supabase.from("promo_redemptions").insert({
                        promo_id: order.promo_id,
                        user_id: order.user_id,
                        order_id: orderId,
                        discount_cents: order.discount_cents,
                    });
                    if (promoInsertErr?.code === "23505") {
                        // already redeemed by concurrent request — treat as success
                    }
                }
            }

            const { data: slotData } = await supabase
                .from("order_dept_slots")
                .select("dept_ready_at")
                .eq("order_id", orderId);
            const readyAt = slotData?.length
                ? slotData.reduce((max, r) => (r.dept_ready_at > max ? r.dept_ready_at : max), slotData[0].dept_ready_at)
                : undefined;

            return NextResponse.json({ ok: true, data: { orderId, status: "received", isPaid: true, readyAt } });
        }

        // ── Create path ────────────────────────────────────────────────────────
        const items: { menuId?: string; quantity?: number; specialRequest?: string }[] = Array.isArray(body.items) ? body.items : [];
        const promoCodeRaw: string = typeof body.promoCode === "string" ? body.promoCode : "";
        const userId: string = typeof body.userId === "string" ? body.userId : "";

        if (!userId) return NextResponse.json({ ok: false, message: "userId is required." }, { status: 400 });
        if (items.length === 0) return NextResponse.json({ ok: false, message: "Cart is empty." }, { status: 400 });

        const menuIds = [...new Set(items.map(i => i.menuId).filter(Boolean))] as string[];
        const { data: menuRows, error: menuError } = await supabase
            .from("menu")
            .select("id, name, price, category_id")
            .in("id", menuIds);

        if (menuError) return NextResponse.json({ ok: false, message: "Failed to fetch menu." }, { status: 500 });

        const menuById = new Map((menuRows ?? []).map(m => [m.id, { price: Number(m.price), name: String(m.name), categoryId: m.category_id as string | null }]));

        let subtotalCents = 0;
        for (const item of items) {
            if (!item.menuId || (item.quantity ?? 0) <= 0) continue;
            const menu = menuById.get(item.menuId);
            if (!menu) return NextResponse.json({ ok: false, message: "Menu item not found." }, { status: 400 });
            subtotalCents += Math.round(menu.price * 100) * Number(item.quantity);
        }

        let promo = null;
        let discountCents = 0;
        const promoCode = promoCodeRaw.trim().toUpperCase();

        if (promoCode) {
            const { data: promoRow } = await supabase
                .from("promo_codes")
                .select("*")
                .eq("code_upper", promoCode)
                .maybeSingle();

            if (!promoRow) return NextResponse.json({ ok: false, message: "Promo code not found." }, { status: 400 });
            if (!promoRow.is_active) return NextResponse.json({ ok: false, message: "Promo code is inactive." }, { status: 400 });
            if (promoRow.min_subtotal_cents != null && subtotalCents < promoRow.min_subtotal_cents) {
                return NextResponse.json({ ok: false, message: `Minimum subtotal is $${(promoRow.min_subtotal_cents / 100).toFixed(2)}.` }, { status: 400 });
            }

            if ((promoRow.usage_limit_per_user ?? 0) > 0) {
                const { count } = await supabase
                    .from("promo_redemptions")
                    .select("id", { count: "exact", head: true })
                    .eq("promo_id", promoRow.id)
                    .eq("user_id", userId);
                if ((count ?? 0) > 0) return NextResponse.json({ ok: false, message: "Promo code already used." }, { status: 400 });
            }

            discountCents = promoRow.type === "PERCENT"
                ? Math.round((subtotalCents * Number(promoRow.value)) / 100)
                : Number(promoRow.value);

            if (promoRow.max_discount_cents != null) discountCents = Math.min(discountCents, promoRow.max_discount_cents);
            discountCents = Math.min(discountCents, subtotalCents);
            if (discountCents <= 0) return NextResponse.json({ ok: false, message: "Promo code does not apply." }, { status: 400 });

            promo = { promoId: promoRow.id, codeUpper: promoCode, discountCents };
        }

        const totalCents = Math.max(0, subtotalCents - discountCents);

        const orderItemsPayload = items
            .map(item => {
                if (!item.menuId || (item.quantity ?? 0) <= 0) return null;
                const menu = menuById.get(item.menuId);
                if (!menu) return null;
                return {
                    menu_id: item.menuId,
                    name: menu.name,
                    price: menu.price,
                    qty: Number(item.quantity),
                    special_request: normalizeRequest(item.specialRequest),
                    categoryId: menu.categoryId,
                };
            })
            .filter(Boolean) as { menu_id: string; name: string; price: number; qty: number; special_request?: string; categoryId: string | null }[];

        const uniqueCategoryIds = [...new Set(orderItemsPayload.map(i => i.categoryId).filter(Boolean))] as string[];

        // ── Free order — no Stripe step ────────────────────────────────────────
        if (totalCents === 0) {
            const { data: orderDoc, error: insertErr } = await supabase
                .from("orders")
                .insert({
                    user_id: userId,
                    status: "received",
                    is_paid: true,
                    total: totalCents / 100,
                    promo_id: promo?.promoId ?? null,
                    promo_code: promo?.codeUpper ?? null,
                    discount_cents: promo?.discountCents ?? null,
                })
                .select("id, order_number")
                .single();

            if (insertErr || !orderDoc) return NextResponse.json({ ok: false, message: "Failed to create order." }, { status: 500 });

            const itemsForInsert = orderItemsPayload.map(({ categoryId: _c, ...i }) => ({ ...i, order_id: orderDoc.id }));
            await supabase.from("order_items").insert(itemsForInsert);

            if (promo) {
                const { error: promoInsertErr } = await supabase.from("promo_redemptions").insert({
                    promo_id: promo.promoId,
                    user_id: userId,
                    order_id: orderDoc.id,
                    discount_cents: promo.discountCents,
                });
                if (promoInsertErr?.code === "23505") {
                    return NextResponse.json({ ok: false, message: "Promo code already used." }, { status: 400 });
                }
            }

            const readyAt = await populateDeptSlots(supabase, orderDoc.id, uniqueCategoryIds).catch(() => null);

            return NextResponse.json({
                ok: true,
                data: {
                    orderId: orderDoc.id,
                    orderNumber: String(orderDoc.order_number),
                    paymentRequired: false,
                    paymentIntentId: null,
                    clientSecret: null,
                    subtotalCents,
                    discountCents,
                    totalCents,
                    promo,
                    readyAt: readyAt ?? undefined,
                },
            });
        }

        // ── Paid order — create Stripe PaymentIntent first ─────────────────────
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalCents,
            currency: process.env.STRIPE_CURRENCY ?? "sgd",
            automatic_payment_methods: { enabled: true },
            metadata: { userId, promoCode: promo?.codeUpper ?? "" },
        });

        const { data: orderDoc, error: insertErr } = await supabase
            .from("orders")
            .insert({
                user_id: userId,
                status: "pending_payment",
                is_paid: false,
                total: totalCents / 100,
                promo_id: promo?.promoId ?? null,
                promo_code: promo?.codeUpper ?? null,
                discount_cents: promo?.discountCents ?? null,
                payment_intent_id: paymentIntent.id,
            })
            .select("id, order_number")
            .single();

        if (insertErr || !orderDoc) {
            await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => null);
            return NextResponse.json({ ok: false, message: "Failed to create order." }, { status: 500 });
        }

        const itemsForInsert = orderItemsPayload.map(({ categoryId: _c, ...i }) => ({ ...i, order_id: orderDoc.id }));
        await supabase.from("order_items").insert(itemsForInsert);

        const readyAt = await populateDeptSlots(supabase, orderDoc.id, uniqueCategoryIds).catch(() => null);

        return NextResponse.json({
            ok: true,
            data: {
                orderId: orderDoc.id,
                orderNumber: String(orderDoc.order_number),
                paymentRequired: true,
                paymentIntentId: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                subtotalCents,
                discountCents,
                totalCents,
                promo,
                readyAt: readyAt ?? undefined,
            },
        });
    } catch (err) {
        console.error("[create-checkout]", err);
        return NextResponse.json({ ok: false, message: "Server error." }, { status: 500 });
    }
}
