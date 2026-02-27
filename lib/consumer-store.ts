import { create } from 'zustand';

// Types
export interface NearbyDeal {
  id: string;
  dealId?: string;
  business: string;
  businessId?: string;
  category: string;
  categoryKey?: string;
  emoji?: string;
  discount: number;
  discountValue?: number;
  discountType?: string;
  description: string;
  title?: string;
  distance: string;
  timeLeft: string;
  color: string;
  urgent: boolean;
  lat: number;
  lng: number;
  originalPrice?: number;
  dealPrice?: number;
  maxClaims?: number;
  currentClaims?: number;
  expiresAt?: string;
  imageUrl?: string;
  isFlash?: boolean;
  status?: string;
  businessLogo?: string;
}

export interface ClaimedDeal {
  id: string;
  claimId?: string;
  business: string;
  dealName: string;
  discount: number;
  color: string;
  claimedAt: string;
  distance: string;
  status: 'redeemed' | 'claimed' | 'expired';
  saved: number;
}

export interface SavedDeal {
  id: string;
  dealId?: string;
  business: string;
  description: string;
  discount: number;
  color: string;
  emoji?: string;
  emojiBg?: string;
  distance: string;
  categoryKey?: string;
}

export interface StreakData {
  count: number;
  currentStreak?: number;
  longestStreak?: number;
  weekDays: ('done' | 'today' | 'future')[];
  weekTracker?: boolean[];
  monthlySavings: number;
  monthlyTarget: number;
  dealsClaimed: number;
  totalClaims?: number;
}

// Store
interface ConsumerState {
  nearbyDeals: NearbyDeal[];
  claimedDeals: ClaimedDeal[];
  savedDeals: SavedDeal[];
  streak: StreakData;
  flashDeal: NearbyDeal | null;
  selectedCategories: string[];
  activeFilter: string;
  isLoadingDeals: boolean;
  isLoadingFlash: boolean;
  dealsError: string | null;

  setActiveFilter: (filter: string) => void;
  toggleCategory: (category: string) => void;
  setSelectedCategories: (categories: string[]) => void;
  claimDeal: (dealId: string) => Promise<{ claimId: string; qrToken: string } | null>;
  toggleSavedDeal: (dealId: string) => void;
  fetchNearbyDeals: (lat: number, lng: number, category?: string) => Promise<void>;
  fetchFlashDeal: (lat: number, lng: number) => Promise<void>;
  fetchClaimedDeals: () => Promise<void>;
  fetchSavedDeals: () => Promise<void>;
  fetchStreak: () => Promise<void>;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#ff6b35', coffee: '#c8e000', grocery: '#3b82f6', restaurant: '#ff6b35',
  fitness: '#a855f7', fashion: '#ec4899', books: '#f59e0b', services: '#06b6d4',
  entertainment: '#8b5cf6', health: '#10b981', beauty: '#f472b6', drinks: '#c8e000',
  shopping: '#3b82f6', other: '#6b7280',
};

function mapApiDeal(d: any): NearbyDeal {
  const cat = (d.category || 'other').toLowerCase();
  const distM = d.distance || 0;
  const distStr = distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`;
  const expiresMs = d.expiresAt ? new Date(d.expiresAt).getTime() - Date.now() : 0;
  const minsLeft = Math.max(0, Math.floor(expiresMs / 60000));
  const timeLeft = minsLeft < 60 ? `${minsLeft} min left` : `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m left`;

  return {
    id: d.dealId || d.id,
    dealId: d.dealId,
    business: d.businessName || d.business || d.title || '',
    businessId: d.businessId,
    category: d.category || 'Other',
    categoryKey: cat,
    emoji: '',
    discount: d.discountValue || d.discount || 0,
    discountValue: d.discountValue,
    discountType: d.discountType,
    description: d.description || '',
    title: d.title,
    distance: distStr,
    timeLeft,
    color: CATEGORY_COLORS[cat] || '#6b7280',
    urgent: minsLeft < 30,
    lat: d.latitude || 0,
    lng: d.longitude || 0,
    originalPrice: d.originalPrice,
    dealPrice: d.dealPrice,
    maxClaims: d.maxClaims,
    currentClaims: d.currentClaims,
    expiresAt: d.expiresAt,
    imageUrl: d.imageUrl,
    isFlash: d.isFlash,
    status: d.status,
    businessLogo: d.businessLogo,
  };
}

export const useConsumerStore = create<ConsumerState>((set, get) => ({
  nearbyDeals: [],
  claimedDeals: [],
  savedDeals: [],
  streak: {
    count: 0,
    weekDays: ['future', 'future', 'future', 'future', 'future', 'future', 'future'],
    monthlySavings: 0,
    monthlyTarget: 400,
    dealsClaimed: 0,
  },
  flashDeal: null,
  selectedCategories: [],
  activeFilter: 'all',
  isLoadingDeals: false,
  isLoadingFlash: false,
  dealsError: null,

  setActiveFilter: (filter) => set({ activeFilter: filter }),
  toggleCategory: (category) => set((state) => {
    const cats = new Set(state.selectedCategories);
    if (cats.has(category)) cats.delete(category);
    else cats.add(category);
    return { selectedCategories: Array.from(cats) };
  }),
  setSelectedCategories: (categories) => set({ selectedCategories: categories }),

  claimDeal: async (dealId) => {
    const deal = get().nearbyDeals.find(d => d.id === dealId);
    if (!deal) return null;
    try {
      const { api } = await import('./api');
      const res = await api.post<{ claim: { claimId: string; qrToken: string } }>('/api/claims', { dealId: deal.dealId || dealId });
      const claim = res.claim || (res as any);
      set((state) => ({
        claimedDeals: [
          { id: claim.claimId, claimId: claim.claimId, business: deal.business, dealName: deal.description, discount: deal.discount, color: deal.color, claimedAt: 'Just now', distance: deal.distance, status: 'claimed' as const, saved: 0 },
          ...state.claimedDeals,
        ],
      }));
      return { claimId: claim.claimId, qrToken: claim.qrToken };
    } catch {
      return null;
    }
  },

  toggleSavedDeal: (dealId) => set((state) => {
    const exists = state.savedDeals.find(d => d.id === dealId);
    if (exists) {
      return { savedDeals: state.savedDeals.filter(d => d.id !== dealId) };
    }
    return state;
  }),

  fetchNearbyDeals: async (lat: number, lng: number, category?: string) => {
    set({ isLoadingDeals: true, dealsError: null });
    try {
      const { api } = await import('./api');
      const params: Record<string, string> = { lat: String(lat), lng: String(lng), radius: '5000', limit: '50' };
      if (category) params.category = category;
      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get<{ deals: any[]; total: number }>(`/api/deals/nearby?${queryStr}`);
      set({ nearbyDeals: (res.deals || []).map(mapApiDeal), isLoadingDeals: false });
    } catch (err) {
      set({ dealsError: 'Failed to load deals', isLoadingDeals: false });
    }
  },

  fetchFlashDeal: async (lat: number, lng: number) => {
    set({ isLoadingFlash: true });
    try {
      const { api } = await import('./api');
      const res = await api.get<{ deal: any | null }>(`/api/deals/flash?lat=${lat}&lng=${lng}`);
      set({ flashDeal: res.deal ? mapApiDeal(res.deal) : null, isLoadingFlash: false });
    } catch {
      set({ isLoadingFlash: false });
    }
  },

  fetchClaimedDeals: async () => {
    try {
      const { api } = await import('./api');
      const res = await api.get<{ currentStreak: number; recentClaims: any[] }>('/api/consumer/streak');
      const claimed: ClaimedDeal[] = (res.recentClaims || []).map((c: any) => ({
        id: c.claimId,
        claimId: c.claimId,
        business: c.dealTitle || '',
        dealName: c.dealTitle || '',
        discount: c.dealDiscount || 0,
        color: '#c8e000',
        claimedAt: c.claimedAt || '',
        distance: '',
        status: c.status || 'claimed',
        saved: c.dealDiscount || 0,
      }));
      set({ claimedDeals: claimed });
    } catch {
      // Keep existing data
    }
  },

  fetchSavedDeals: async () => {
    try {
      const { api } = await import('./api');
      const res = await api.get<{ saves: any[] }>('/api/saves');
      const saved: SavedDeal[] = (res.saves || []).map((s: any) => {
        const deal = s.deal || {};
        const cat = (deal.category || 'other').toLowerCase();
        return {
          id: s.dealId,
          dealId: s.dealId,
          business: deal.title || deal.businessName || '',
          description: deal.description || '',
          discount: deal.discountValue || 0,
          color: CATEGORY_COLORS[cat] || '#6b7280',
          emoji: '',
          emojiBg: '',
          distance: '',
          categoryKey: cat,
        };
      });
      set({ savedDeals: saved });
    } catch {
      // Keep existing data
    }
  },

  fetchStreak: async () => {
    try {
      const { api } = await import('./api');
      const [streakRes, savingsRes] = await Promise.all([
        api.get<{ currentStreak: number; longestStreak: number; weekTracker: boolean[]; totalClaims: number }>('/api/consumer/streak'),
        api.get<{ monthlySavings: number; allTimeSavings: number; claimsThisMonth: number }>('/api/consumer/savings'),
      ]);

      const today = new Date().getDay();
      const todayIdx = today === 0 ? 6 : today - 1; // Mon=0, Sun=6
      const weekDays: ('done' | 'today' | 'future')[] = (streakRes.weekTracker || []).map((done, i) => {
        if (i < todayIdx) return done ? 'done' : 'future';
        if (i === todayIdx) return 'today';
        return 'future';
      });

      set({
        streak: {
          count: streakRes.currentStreak || 0,
          currentStreak: streakRes.currentStreak,
          longestStreak: streakRes.longestStreak,
          weekDays,
          weekTracker: streakRes.weekTracker,
          monthlySavings: savingsRes.monthlySavings || 0,
          monthlyTarget: 400,
          dealsClaimed: savingsRes.claimsThisMonth || 0,
          totalClaims: streakRes.totalClaims,
        },
      });
    } catch {
      // Keep existing data
    }
  },
}));
