import { TABLE_ORDERS, VALID_ORDER_STATUSES } from "@/lib/config";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
        const status = typeof body.status === "string" ? body.status.trim() : "";

        if (!orderId || !status) {
            return NextResponse.json({ ok: false, message: "orderId and status are required." }, { status: 400 });
        }

        if (!(VALID_ORDER_STATUSES as readonly string[]).includes(status)) {
            return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 400 });
        }

        const { error } = await supabase
            .from(TABLE_ORDERS)
            .update({ status })
            .eq("id", orderId);

        if (error) {
            return NextResponse.json({ ok: false, message: "Failed to update order status." }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false, message: "Server error." }, { status: 500 });
    }
}
