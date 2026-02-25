import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

export type Deal = {
  id: string;
  dealId?: string;
  business: string;
  category: string;
  categoryKey: string;
  discount: number;
  description: string;
  distance: string;
  timeLeft: string;
  color: string;
  urgent: boolean;
  lat: number;
  lng: number;
};

const CATEGORY_COLORS: Record<string, string> = {
  food: '#ff6b35', coffee: '#c8e000', grocery: '#3b82f6', restaurant: '#ff6b35',
  fitness: '#a855f7', fashion: '#ec4899', books: '#f59e0b', services: '#06b6d4',
  entertainment: '#8b5cf6', health: '#10b981', beauty: '#f472b6', drinks: '#c8e000',
  shopping: '#3b82f6', other: '#6b7280',
};

export function useSearchDeals(query: string, lat?: number, lng?: number) {
  const [results, setResults] = useState<Deal[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef('');

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    lastQueryRef.current = q;
    setIsSearching(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        q,
        radius: '5000',
        limit: '20',
      };
      if (lat != null) params.lat = String(lat);
      if (lng != null) params.lng = String(lng);
      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get<{ deals: any[]; total: number }>(`/api/deals/nearby?${queryStr}`);

      // Only update if this is still the latest query
      if (lastQueryRef.current !== q) return;

      const mapped: Deal[] = (res.deals || []).map((d: any) => {
        const cat = (d.category || 'other').toLowerCase();
        const distM = d.distance || 0;
        const distStr = distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`;
        const expiresMs = d.expiresAt ? new Date(d.expiresAt).getTime() - Date.now() : 0;
        const minsLeft = Math.max(0, Math.floor(expiresMs / 60000));
        const timeLeft = minsLeft < 60 ? `${minsLeft} min left` : `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m left`;

        return {
          id: d.dealId || d.id,
          dealId: d.dealId,
          business: d.title || d.businessName || '',
          category: d.category || 'Other',
          categoryKey: cat,
          discount: d.discountValue || d.discount || 0,
          description: d.description || '',
          distance: distStr,
          timeLeft,
          color: CATEGORY_COLORS[cat] || '#6b7280',
          urgent: minsLeft < 30,
          lat: d.latitude || 0,
          lng: d.longitude || 0,
        };
      });

      setResults(mapped);
    } catch (err: any) {
      if (lastQueryRef.current === q) {
        setError(err?.message || 'Search failed');
        setResults([]);
      }
    } finally {
      if (lastQueryRef.current === q) setIsSearching(false);
    }
  }, [lat, lng]);

  const retry = useCallback(() => {
    if (lastQueryRef.current) search(lastQueryRef.current);
  }, [search]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    setIsSearching(true);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      search(query);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, search]);

  return { results, isSearching, error, retry };
}
