import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  token: string | null;
  userId: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, userId: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, userId) => {
        localStorage.setItem("radius_token", token);
        set({ token, userId, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem("radius_token");
        set({ token: null, userId: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: "radius-auth",
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
