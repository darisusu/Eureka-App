import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const phone = typeof body.phone === "string" ? body.phone.trim() : "";
        const pin = typeof body.pin === "string" ? body.pin : "";

        if (!phone || !pin) {
            return NextResponse.json({ ok: false, message: "Phone and PIN are required." }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("users")
            .select("id, name, phone, role, pin_hash")
            .eq("phone", phone)
            .maybeSingle();

        if (error || !data) {
            return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
        }

        if (data.role !== "staff") {
            return NextResponse.json({ ok: false, message: "PIN authentication is for staff only." }, { status: 403 });
        }

        if (!data.pin_hash) {
            return NextResponse.json({ ok: false, message: "No PIN configured for this account." }, { status: 403 });
        }

        const match = await bcryptjs.compare(pin, data.pin_hash);
        if (!match) {
            return NextResponse.json({ ok: false, message: "Incorrect PIN." }, { status: 401 });
        }

        return NextResponse.json({
            ok: true,
            data: { id: data.id, name: data.name, phone: data.phone, role: data.role },
        });
    } catch {
        return NextResponse.json({ ok: false, message: "Server error." }, { status: 500 });
    }
}
