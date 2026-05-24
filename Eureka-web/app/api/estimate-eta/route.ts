import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const categoryIds: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : [];

        if (!categoryIds.length) {
            return NextResponse.json({ ok: false, message: "categoryIds is required." }, { status: 400 });
        }

        const results: { categoryId: string; readyAt: string | null }[] = [];

        for (const categoryId of categoryIds) {
            const { data: readyAt } = await supabase.rpc("calculate_dept_ready_at", { p_category_id: categoryId });
            results.push({ categoryId, readyAt: readyAt as string | null });
        }

        const validReadyAts = results.map(r => r.readyAt).filter(Boolean) as string[];
        if (!validReadyAts.length) {
            return NextResponse.json({ ok: true, data: { minutesFromNow: null } });
        }

        const maxReadyAt = validReadyAts.reduce((max, r) => (r > max ? r : max), validReadyAts[0]);
        const minutesFromNow = Math.ceil((new Date(maxReadyAt).getTime() - Date.now()) / 60000);

        return NextResponse.json({ ok: true, data: { minutesFromNow } });
    } catch (err) {
        console.error("[estimate-eta]", err);
        return NextResponse.json({ ok: false, message: "Server error." }, { status: 500 });
    }
}
