import { create } from "zustand";
import api from "@/lib/api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; company?: string }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  hydrate: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (token) {
      set({ token });
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const { data } = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("token", data.access_token);
    set({ token: data.access_token });
    // Fetch user profile
    const { data: user } = await api.get("/auth/me");
    set({ user, isLoading: false });
  },

  register: async (payload) => {
    await api.post("/auth/register", payload);
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null, isLoading: false });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
