import { getCurrentUser } from "@/lib/appwrite";
import type { User } from "@/type";
import { create } from "zustand";

type AuthState = {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;

    setIsAuthenticated: (value: boolean) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    fetchAuthenticatedUser: () => Promise<User | null>;
};

const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    user: null,
    isLoading: true,

    setIsAuthenticated: (value) => set({ isAuthenticated: value }),
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ isLoading: loading }),

    fetchAuthenticatedUser: async () => {
        set({ isLoading: true });
        try {
            const user = await getCurrentUser();
            if (user != null) {
                set({ isAuthenticated: true, user: user as User });
                return user as User;
            } else {
                set({ isAuthenticated: false, user: null });
                return null;
            }
        } catch (e) {
            console.log("Error fetching authenticated user:", e);
            set({ isAuthenticated: false, user: null });
            return null;
        } finally {
            set({ isLoading: false });
        }
    },
}));

export default useAuthStore;
