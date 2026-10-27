import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Vendor {
  vendor_id: string;
  name: string;
}

export interface VendorAuthState {
  token: string | null;
  vendor: Vendor | null;
  login: (token: string, vendor: Vendor) => void;
  logout: () => void;
}

export const useVendorAuthStore = create<VendorAuthState>((set) => {
  // Try to load initial state from localStorage (web only for simplicity in this workaround)
  let initialToken = null;
  let initialVendor = null;
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('vendor-auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        initialToken = parsed.token;
        initialVendor = parsed.vendor;
      }
    } catch (e) {}
  }

  return {
    token: initialToken,
    vendor: initialVendor,
    login: (token, vendor) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('vendor-auth-storage', JSON.stringify({ token, vendor }));
      }
      set({ token, vendor });
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('vendor-auth-storage');
      }
      set({ token: null, vendor: null });
    },
  };
});
