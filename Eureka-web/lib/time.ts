// SGT is UTC+8; avoid locale API dependency so this works in both Node.js and browsers.
export const nowSGT = (): string => {
    const sgt = new Date(Date.now() + 8 * 60 * 60 * 1_000);
    const hh = String(sgt.getUTCHours()).padStart(2, "0");
    const mm = String(sgt.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
};

const fmtTime = (t: string): string => {
    // Handles both "HH:MM" and "HH:MM:SS" (Supabase TIME columns include seconds)
    const parts = t.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] ?? "0", 10);
    const suffix = h < 12 ? "am" : "pm";
    const hour = h % 12 || 12;
    return m === 0 ? `${hour}${suffix}` : `${hour}.${String(m).padStart(2, "0")}${suffix}`;
};

export const isCategoryAvailable = (
    available_from: string | null,
    available_until: string | null
): boolean => {
    if (!available_from || !available_until) return true;
    const now = nowSGT();
    // Normalise to "HH:MM" so string comparison works even when DB returns "HH:MM:SS"
    return now >= available_from.slice(0, 5) && now <= available_until.slice(0, 5);
};

// For categories with parent_category_id, replaces available_from/until with the parent's values.
export const resolveParentTiming = <T extends { id: string; parent_category_id?: string | null; available_from: string | null; available_until: string | null }>(
    cats: T[]
): T[] => {
    const byId = new Map(cats.map((c) => [c.id, c]));
    return cats.map((c) => {
        if (!c.parent_category_id) return c;
        const parent = byId.get(c.parent_category_id);
        if (!parent) return c;
        return { ...c, available_from: parent.available_from, available_until: parent.available_until };
    });
};

// Formats a time window as "10am – 2.30pm"
export const formatWindow = (from: string | null, until: string | null): string => {
    if (!from || !until) return "";
    return `${fmtTime(from)} – ${fmtTime(until)}`;
};
