import { create } from 'zustand';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'superadmin';
  twoFactorEnabled?: boolean;   // ← add this

}

interface AuthStore {
  admin: Admin | null;
  setAdmin: (admin: Admin | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthStore>((set) => ({
  admin: null, // no persistence — memory only; session lives in httpOnly cookie
  setAdmin: (admin) => set({ admin }),
  logout: () => set({ admin: null }),
}));