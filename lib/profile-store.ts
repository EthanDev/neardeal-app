import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

let syncTimer: ReturnType<typeof setTimeout> | null = null;

interface NotificationPreferences {
  dealAlerts: boolean;
  flashAlerts: boolean;
  lastChance: boolean;
  monthlySummary: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  dealAlerts: true,
  flashAlerts: true,
  lastChance: true,
  monthlySummary: true,
};

interface ProfileState {
  name: string;
  district: string;
  avatarUri: string | null;
  referralCode: string;
  selectedCategories: string[];
  quietStartHour: number;
  quietEndHour: number;
  maxRadius: number;
  notificationPreferences: NotificationPreferences;
  syncing: boolean;
  hydrated: boolean;
  setName: (name: string) => void;
  setDistrict: (district: string) => void;
  setMaxRadius: (radius: number) => void;
  setQuietHours: (start: number, end: number) => void;
  setAvatarUri: (uri: string | null) => void;
  setSelectedCategories: (categories: string[]) => void;
  setNotificationPreference: (key: keyof NotificationPreferences, value: boolean) => void;
  syncToBackend: (data?: Record<string, unknown>) => Promise<void>;
  loadFromBackend: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  name: '',
  district: '',
  avatarUri: null,
  referralCode: '',
  selectedCategories: ['food', 'grocery', 'fitness'],
  quietStartHour: 22,
  quietEndHour: 8,
  maxRadius: 500,
  notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFS },
  syncing: false,
  hydrated: false,

  setName: async (name: string) => {
    set({ name });
    await SecureStore.setItemAsync('neardeal_profile_name', name).catch(() => null);
    // Debounced backend sync
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => get().syncToBackend({ name }), 800);
  },

  setDistrict: async (district: string) => {
    set({ district });
    await SecureStore.setItemAsync('neardeal_profile_district', district).catch(() => null);
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => get().syncToBackend({ district }), 800);
  },

  setMaxRadius: async (radius: number) => {
    set({ maxRadius: radius });
    await SecureStore.setItemAsync('neardeal_max_radius', String(radius)).catch(() => null);
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => get().syncToBackend({ maxRadius: radius }), 800);
  },

  setQuietHours: async (start: number, end: number) => {
    set({ quietStartHour: start, quietEndHour: end });
    await SecureStore.setItemAsync('neardeal_quiet_start_hour', String(start)).catch(() => null);
    await SecureStore.setItemAsync('neardeal_quiet_end_hour', String(end)).catch(() => null);
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => get().syncToBackend({ quietStartHour: start, quietEndHour: end }), 800);
  },

  setSelectedCategories: async (categories: string[]) => {
    set({ selectedCategories: categories });
    await SecureStore.setItemAsync('neardeal_selected_categories', JSON.stringify(categories)).catch(() => null);
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => get().syncToBackend({ selectedCategories: categories }), 800);
  },

  setNotificationPreference: async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...get().notificationPreferences, [key]: value };
    set({ notificationPreferences: updated });
    await SecureStore.setItemAsync('neardeal_notification_prefs', JSON.stringify(updated)).catch(() => null);
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => get().syncToBackend({ notificationPreferences: get().notificationPreferences }), 800);
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
      const payload = data || { name: get().name, district: get().district, avatarUrl: get().avatarUri, selectedCategories: get().selectedCategories, quietStartHour: get().quietStartHour, quietEndHour: get().quietEndHour, maxRadius: get().maxRadius, notificationPreferences: get().notificationPreferences };
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
      if (profile.district) {
        set({ district: profile.district });
        await SecureStore.setItemAsync('neardeal_profile_district', profile.district).catch(() => null);
      }
      if (profile.avatarUrl) {
        set({ avatarUri: profile.avatarUrl });
        await SecureStore.setItemAsync('neardeal_avatar_uri', profile.avatarUrl).catch(() => null);
      }
      if (profile.selectedCategories && Array.isArray(profile.selectedCategories)) {
        set({ selectedCategories: profile.selectedCategories });
        await SecureStore.setItemAsync('neardeal_selected_categories', JSON.stringify(profile.selectedCategories)).catch(() => null);
      }
      if (profile.notificationPreferences && typeof profile.notificationPreferences === 'object') {
        const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...profile.notificationPreferences };
        set({ notificationPreferences: prefs });
        await SecureStore.setItemAsync('neardeal_notification_prefs', JSON.stringify(prefs)).catch(() => null);
      }
      if (typeof profile.maxRadius === 'number') {
        set({ maxRadius: profile.maxRadius });
        await SecureStore.setItemAsync('neardeal_max_radius', String(profile.maxRadius)).catch(() => null);
      }
      if (typeof profile.quietStartHour === 'number') {
        set({ quietStartHour: profile.quietStartHour });
        await SecureStore.setItemAsync('neardeal_quiet_start_hour', String(profile.quietStartHour)).catch(() => null);
      }
      if (typeof profile.quietEndHour === 'number') {
        set({ quietEndHour: profile.quietEndHour });
        await SecureStore.setItemAsync('neardeal_quiet_end_hour', String(profile.quietEndHour)).catch(() => null);
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
    const [name, district, avatarUri, categoriesJson, notifPrefsJson, quietStartStr, quietEndStr, maxRadiusStr] = await Promise.all([
      SecureStore.getItemAsync('neardeal_profile_name').catch(() => null),
      SecureStore.getItemAsync('neardeal_profile_district').catch(() => null),
      SecureStore.getItemAsync('neardeal_avatar_uri').catch(() => null),
      SecureStore.getItemAsync('neardeal_selected_categories').catch(() => null),
      SecureStore.getItemAsync('neardeal_notification_prefs').catch(() => null),
      SecureStore.getItemAsync('neardeal_quiet_start_hour').catch(() => null),
      SecureStore.getItemAsync('neardeal_quiet_end_hour').catch(() => null),
      SecureStore.getItemAsync('neardeal_max_radius').catch(() => null),
    ]);
    const parsedCategories = categoriesJson ? (() => { try { return JSON.parse(categoriesJson); } catch { return null; } })() : null;
    const parsedNotifPrefs = notifPrefsJson ? (() => { try { return JSON.parse(notifPrefsJson); } catch { return null; } })() : null;
    set({
      name: name || '',
      district: district || '',
      avatarUri: avatarUri || null,
      selectedCategories: Array.isArray(parsedCategories) ? parsedCategories : ['food', 'grocery', 'fitness'],
      quietStartHour: quietStartStr != null ? Number(quietStartStr) : 22,
      quietEndHour: quietEndStr != null ? Number(quietEndStr) : 8,
      maxRadius: maxRadiusStr != null ? Number(maxRadiusStr) : 500,
      notificationPreferences: parsedNotifPrefs && typeof parsedNotifPrefs === 'object' ? { ...DEFAULT_NOTIFICATION_PREFS, ...parsedNotifPrefs } : { ...DEFAULT_NOTIFICATION_PREFS },
      hydrated: true,
    });
    // Non-blocking backend sync
    get().loadFromBackend();
  },
}));
