import { getCurrentUser } from '@/lib/appwrite';
import type { User } from '@sentry/react-native';
import { create } from 'zustand'

type AuthState = {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;

    setIsAuthenticated: (value: boolean) => void; //sets state and returns void
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;

    fetchAuthenticatedUser: () => Promise<void>;

}

// create initial Zustand store
// to be called from any component to access auth state
// defines state structure and functions to update state 
const useAuthStore = create<AuthState>((set) => ({ // set is Zustand's function to update state
    isAuthenticated : false,
    user: null,
    isLoading: true,

    setIsAuthenticated: (value) => set({ isAuthenticated: value }), // updates isAuthenticated state to object with new value
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ isLoading: loading }),

    fetchAuthenticatedUser: async () => {
        set({ isLoading: true });
        try {

            const user = await getCurrentUser()
            if (user != null) {
                set({ isAuthenticated: true, user: user as User });
            } else {
                set ({ isAuthenticated: false, user: null });
            }

        } catch (e) {
            console.log('Error fetching authenticated user:', e);
            set({ isAuthenticated: false, user: null });
        } finally {
            set({ isLoading: false });
        }
    
    }

  })) 

  export default useAuthStore;