import { TABLE_CATEGORIES, TABLE_MENU, TABLE_PROMO_CODES, TABLE_PROMO_REDEMPTIONS } from "@/lib/config";
import { formatWindow, nowSGT } from "@/lib/time";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const items: { menuId?: string; quantity?: number }[] = Array.isArray(body.items) ? body.items : [];
        const promoCodeRaw: string = typeof body.promoCode === "string" ? body.promoCode : "";
        const userId: string = typeof body.userId === "string" ? body.userId : "";

        if (items.length === 0) {
            return NextResponse.json({ ok: true, data: { subtotalCents: 0, discountCents: 0, totalCents: 0, promo: null } });
        }

        const menuIds = [...new Set(items.map(i => i.menuId).filter(Boolean))] as string[];
        if (menuIds.length === 0) {
            return NextResponse.json({ ok: false, message: "No menu items provided." }, { status: 400 });
        }

        const { data: menuRows, error: menuError } = await supabase
            .from(TABLE_MENU)
            .select("id, price, category_id")
            .in("id", menuIds);

        if (menuError) {
            return NextResponse.json({ ok: false, message: "Failed to fetch menu." }, { status: 500 });
        }

        // Category availability check
        const cartCategoryIds = [...new Set(
            (menuRows ?? []).map(m => m.category_id).filter(Boolean)
        )] as string[];

        if (cartCategoryIds.length > 0) {
            const { data: catRows } = await supabase
                .from(TABLE_CATEGORIES)
                .select("id, name, available_from, available_until")
                .in("id", cartCategoryIds);

            const now = nowSGT();
            for (const cat of catRows ?? []) {
                if (cat.available_from && cat.available_until) {
                    if (now < cat.available_from.slice(0, 5) || now > cat.available_until.slice(0, 5)) {
                        return NextResponse.json(
                            { ok: false, message: `${cat.name} is not available right now (available ${formatWindow(cat.available_from, cat.available_until)}).` },
                            { status: 400 }
                        );
                    }
                }
            }
        }

        const priceById = new Map((menuRows ?? []).map(m => [m.id, Number(m.price)]));

        let subtotalCents = 0;
        for (const item of items) {
            if (!item.menuId || (item.quantity ?? 0) <= 0) continue;
            const price = priceById.get(item.menuId);
            if (typeof price !== "number") {
                return NextResponse.json({ ok: false, message: "Menu item not found." }, { status: 400 });
            }
            subtotalCents += Math.round(price * 100) * Number(item.quantity);
        }

        let promo = null;
        let discountCents = 0;
        const promoCode = promoCodeRaw.trim().toUpperCase();

        if (promoCode) {
            if (!userId) {
                return NextResponse.json({ ok: false, message: "User must be signed in to use promo codes." }, { status: 400 });
            }

            const { data: promoRow } = await supabase
                .from(TABLE_PROMO_CODES)
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
                    .from(TABLE_PROMO_REDEMPTIONS)
                    .select("id", { count: "exact", head: true })
                    .eq("promo_id", promoRow.id)
                    .eq("user_id", userId);
                if ((count ?? 0) > 0) {
                    return NextResponse.json({ ok: false, message: "Promo code already used." }, { status: 400 });
                }
            }

            discountCents = promoRow.type === "PERCENT"
                ? Math.round((subtotalCents * Number(promoRow.value)) / 100)
                : Number(promoRow.value);

            if (promoRow.max_discount_cents != null) discountCents = Math.min(discountCents, promoRow.max_discount_cents);
            discountCents = Math.min(discountCents, subtotalCents);

            if (discountCents <= 0) return NextResponse.json({ ok: false, message: "Promo code does not apply." }, { status: 400 });
            promo = { promoId: promoRow.id, codeUpper: promoCode, discountCents };
        }

        return NextResponse.json({
            ok: true,
            data: { subtotalCents, discountCents, totalCents: Math.max(0, subtotalCents - discountCents), promo },
        });
    } catch {
        return NextResponse.json({ ok: false, message: "Server error." }, { status: 500 });
    }
}
