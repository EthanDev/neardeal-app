import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  signIn,
  signUp,
  signOut,
  refreshSession as cognitoRefreshSession,
  getCurrentSession,
  consumerSignIn,
  consumerSignUp,
  getStoredUserRole,
  type SignUpAttributes,
  type AuthTokens,
  type UserRole,
} from './auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  email: string;
  businessId?: string;
  [key: string]: unknown;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  discount: number;
  validFrom: string;
  validTo: string;
  active: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Decode the payload of a JWT ID token and extract common claims. */
export function parseIdToken(idToken: string): { email: string; sub: string } {
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1])) as {
      email?: string;
      sub?: string;
    };
    return { email: payload.email ?? '', sub: payload.sub ?? '' };
  } catch {
    return { email: '', sub: '' };
  }
}

// ---------------------------------------------------------------------------
// useAuthStore
// ---------------------------------------------------------------------------

interface AuthState {
  user: User | null;
  businessId: string | null;
  accessToken: string | null;
  idToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True once hydrate() has finished its initial check */
  hydrated: boolean;
  userRole: UserRole | null;

  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    attributes: SignUpAttributes,
  ) => Promise<void>;
  consumerLogin: (email: string, password: string) => Promise<void>;
  consumerSignup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  /**
   * Called once on app start. Checks secure-store for a saved refresh token
   * and attempts a silent refresh; sets hydrated = true when done.
   */
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  businessId: null,
  accessToken: null,
  idToken: null,
  isAuthenticated: false,
  isLoading: false,
  hydrated: false,
  userRole: null,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const tokens: AuthTokens = await signIn(email, password);
      const { sub } = parseIdToken(tokens.idToken);
      set({
        user: { email, businessId: sub || undefined },
        businessId: sub || null,
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
        isAuthenticated: true,
        userRole: 'business',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email, password, attributes) => {
    set({ isLoading: true });
    try {
      await signUp(email, password, attributes);
      // After sign-up the user still needs to confirm their email.
      // We do NOT set isAuthenticated here.
    } finally {
      set({ isLoading: false });
    }
  },

  consumerLogin: async (email, password) => {
    set({ isLoading: true });
    try {
      const tokens: AuthTokens = await consumerSignIn(email, password);
      set({
        user: { email },
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
        isAuthenticated: true,
        userRole: 'consumer',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  consumerSignup: async (email, password, name) => {
    set({ isLoading: true });
    try {
      await consumerSignUp(email, password, name);
      // After sign-up the user still needs to confirm their email.
      // We do NOT set isAuthenticated here.
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await signOut();
    } finally {
      set({
        user: null,
        businessId: null,
        accessToken: null,
        idToken: null,
        isAuthenticated: false,
        isLoading: false,
        userRole: null,
      });
    }
  },

  refreshSession: async () => {
    try {
      const tokens = await cognitoRefreshSession();
      set({
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
      });
    } catch {
      // Refresh failed – force logout state.
      set({
        user: null,
        businessId: null,
        accessToken: null,
        idToken: null,
        isAuthenticated: false,
      });
      throw new Error('Session expired. Please sign in again.');
    }
  },

  hydrate: async () => {
    const storedToken = await SecureStore.getItemAsync('neardeal_refresh_token');
    const storedRole = await getStoredUserRole();
    if (storedToken) {
      try {
        const tokens = await getCurrentSession();
        const { email, sub } = parseIdToken(tokens.idToken);
        const isBusiness = storedRole === 'business';
        set({
          user: { email, ...(isBusiness && sub ? { businessId: sub } : {}) },
          businessId: isBusiness ? (sub || null) : null,
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
          isAuthenticated: true,
          userRole: storedRole,
        });
      } catch {
        // Silent refresh failed – user will need to log in manually.
        await SecureStore.deleteItemAsync('neardeal_refresh_token').catch(
          () => null,
        );
      }
    }
    set({ hydrated: true });
  },
}));

// ---------------------------------------------------------------------------
// useDealsStore
// ---------------------------------------------------------------------------

interface DealsState {
  deals: Deal[];
  isLoading: boolean;
  fetchDeals: () => Promise<void>;
  createDeal: (deal: Omit<Deal, 'id'>) => Promise<void>;
  updateDeal: (id: string, updates: Partial<Deal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
}

export const useDealsStore = create<DealsState>((set, get) => ({
  deals: [],
  isLoading: false,

  fetchDeals: async () => {
    set({ isLoading: true });
    try {
      // Import lazily to avoid circular dependency with api.ts.
      const { api } = await import('./api');
      const deals = await api.get<Deal[]>('/deals');
      set({ deals });
    } finally {
      set({ isLoading: false });
    }
  },

  createDeal: async (deal) => {
    set({ isLoading: true });
    try {
      const { api } = await import('./api');
      const created = await api.post<Deal>('/deals', deal);
      set((state) => ({ deals: [...state.deals, created] }));
    } finally {
      set({ isLoading: false });
    }
  },

  updateDeal: async (id, updates) => {
    set({ isLoading: true });
    try {
      const { api } = await import('./api');
      const updated = await api.put<Deal>(`/deals/${id}`, updates);
      set((state) => ({
        deals: state.deals.map((d) => (d.id === id ? updated : d)),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  deleteDeal: async (id) => {
    set({ isLoading: true });
    try {
      const { api } = await import('./api');
      await api.delete<void>(`/deals/${id}`);
      set((state) => ({ deals: state.deals.filter((d) => d.id !== id) }));
    } finally {
      set({ isLoading: false });
    }
  },
}));

// ---------------------------------------------------------------------------
// useUiStore
// ---------------------------------------------------------------------------

type Language = 'ro' | 'en';

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

interface UiState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toastMessage: ToastOptions | null;
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  language: 'ro',
  setLanguage: (lang) => set({ language: lang }),

  toastMessage: null,
  showToast: (options) => set({ toastMessage: options }),
  hideToast: () => set({ toastMessage: null }),
}));
