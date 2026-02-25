import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

let syncTimer: ReturnType<typeof setTimeout> | null = null;

interface ProfileState {
  name: string;
  avatarUri: string | null;
  referralCode: string;
  syncing: boolean;
  hydrated: boolean;
  setName: (name: string) => void;
  setAvatarUri: (uri: string | null) => void;
  syncToBackend: (data?: Record<string, unknown>) => Promise<void>;
  loadFromBackend: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  name: '',
  avatarUri: null,
  referralCode: '',
  syncing: false,
  hydrated: false,

  setName: async (name: string) => {
    set({ name });
    await SecureStore.setItemAsync('neardeal_profile_name', name).catch(() => null);
    // Debounced backend sync
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => get().syncToBackend({ name }), 800);
  },

  setAvatarUri: async (uri: string | null) => {
    set({ avatarUri: uri });
    if (uri) {
      await SecureStore.setItemAsync('neardeal_avatar_uri', uri).catch(() => null);
    } else {
      await SecureStore.deleteItemAsync('neardeal_avatar_uri').catch(() => null);
    }
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => get().syncToBackend({ avatarUrl: uri }), 800);
  },

  syncToBackend: async (data?: Record<string, unknown>) => {
    set({ syncing: true });
    try {
      const { api } = await import('./api');
      const payload = data || { name: get().name, avatarUrl: get().avatarUri };
      await api.put('/api/consumer/profile', payload);
    } catch {
      // Silently fail - local data is primary
    } finally {
      set({ syncing: false });
    }
  },

  loadFromBackend: async () => {
    try {
      const { api } = await import('./api');
      const res = await api.get<{ profile: Record<string, any> }>('/api/consumer/profile');
      const profile = res.profile || res;
      if (profile.name) {
        set({ name: profile.name });
        await SecureStore.setItemAsync('neardeal_profile_name', profile.name).catch(() => null);
      }
      if (profile.avatarUrl) {
        set({ avatarUri: profile.avatarUrl });
        await SecureStore.setItemAsync('neardeal_avatar_uri', profile.avatarUrl).catch(() => null);
      }
      if (profile.referralCode) {
        set({ referralCode: profile.referralCode });
      } else {
        // Fetch or generate referral code from dedicated endpoint
        try {
          const refRes = await api.get<{ referralCode: string }>('/api/referral/code');
          if (refRes.referralCode) {
            set({ referralCode: refRes.referralCode });
          }
        } catch {
          // Silently fail
        }
      }
    } catch {
      // Use local data
    }
  },

  hydrate: async () => {
    const [name, avatarUri] = await Promise.all([
      SecureStore.getItemAsync('neardeal_profile_name').catch(() => null),
      SecureStore.getItemAsync('neardeal_avatar_uri').catch(() => null),
    ]);
    set({
      name: name || '',
      avatarUri: avatarUri || null,
      hydrated: true,
    });
    // Non-blocking backend sync
    get().loadFromBackend();
  },
}));
