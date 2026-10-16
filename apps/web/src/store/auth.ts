'use client';

import { create } from 'zustand';
import type { User } from '../lib/types';

type AuthState = {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  setHydrated: (value: boolean) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setHydrated: (hydrated) => set({ hydrated }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lead_access_token');
      localStorage.removeItem('lead_refresh_token');
      localStorage.removeItem('lead_organization_id');
    }
    set({ user: null });
  },
}));
