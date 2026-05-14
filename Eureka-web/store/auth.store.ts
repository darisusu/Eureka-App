import { createUser, getUserByPhone } from "@/lib/supabase";
import type { User } from "@/type";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\s/g, "");
    if (digits.startsWith("+65")) return digits.slice(3);
    if (digits.startsWith("65") && digits.length === 10) return digits.slice(2);
    return digits;
};

// Accepts most international formats: optional +/country code, then 7–15 digits
const isValidPhone = (phone: string) => /^\+?[\d\s\-()]{7,20}$/.test(phone.trim());

export type SignInResult =
    | { status: "authenticated" }
    | { status: "pin_required" }
    | { status: "not_found" }
    | { status: "invalid_phone" };

type AuthState = {
    isAuthenticated: boolean;
    user: User | null;
    _pendingPhone: string | null;

    signIn: (phone: string) => Promise<SignInResult>;
    verifyPin: (pin: string) => Promise<boolean>;
    signUp: (name: string, phone: string) => Promise<void>;
    login: (user: User) => void;
    logout: () => void;
};

const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            user: null,
            _pendingPhone: null,

            signIn: async (phone) => {
                phone = normalizePhone(phone);
                if (!isValidPhone(phone)) return { status: "invalid_phone" };
                const user = await getUserByPhone(phone);
                if (!user) return { status: "not_found" };
                if (user.role === "staff") {
                    set({ _pendingPhone: phone });
                    return { status: "pin_required" };
                }
                set({ isAuthenticated: true, user });
                return { status: "authenticated" };
            },

            verifyPin: async (pin) => {
                const phone = get()._pendingPhone;
                if (!phone) return false;
                const res = await fetch("/api/verify-pin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone, pin }),
                });
                const result = await res.json();
                if (!result.ok || !result.data) return false;
                set({ isAuthenticated: true, user: result.data, _pendingPhone: null });
                return true;
            },

            signUp: async (name, phone) => {
                phone = normalizePhone(phone);
                if (!isValidPhone(phone)) throw new Error("Please enter a valid phone number.");
                const existing = await getUserByPhone(phone);
                if (existing) throw new Error("This phone number is already registered.");
                const user = await createUser({ name, phone });
                set({ isAuthenticated: true, user });
            },

            login: (user) => set({ isAuthenticated: true, user }),
            logout: () => set({ isAuthenticated: false, user: null, _pendingPhone: null }),
        }),
        {
            name: "eureka-auth",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                user: state.user,
            }),
        }
    )
);

export default useAuthStore;
