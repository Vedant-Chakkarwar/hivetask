import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  color: string;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
