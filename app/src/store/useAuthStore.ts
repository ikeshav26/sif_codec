import { create } from "zustand";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem("sif_auth_token", token);
    localStorage.setItem("sif_auth_user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("sif_auth_token");
    localStorage.removeItem("sif_auth_user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  initAuth: () => {
    // 1. Check if OAuth callback params exist in URL
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth") === "success";
    const tokenParam = params.get("token");
    const userParam = params.get("user");

    if (oauthSuccess && tokenParam) {
      try {
        const parsedUser: User = userParam ? JSON.parse(userParam) : { userId: "user" };
        localStorage.setItem("sif_auth_token", tokenParam);
        localStorage.setItem("sif_auth_user", JSON.stringify(parsedUser));
        
        // Clean URL query params without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
        
        set({ user: parsedUser, token: tokenParam, isAuthenticated: true });
        return;
      } catch (err) {
        console.error("Failed to parse OAuth user param:", err);
      }
    }

    // 2. Fall back to localStorage
    const savedToken = localStorage.getItem("sif_auth_token");
    const savedUserStr = localStorage.getItem("sif_auth_user");

    if (savedToken) {
      let savedUser: User | null = null;
      try {
        savedUser = savedUserStr ? JSON.parse(savedUserStr) : { userId: "user" };
      } catch {
        savedUser = { userId: "user" };
      }
      set({ user: savedUser, token: savedToken, isAuthenticated: true });
    }
  },
}));
