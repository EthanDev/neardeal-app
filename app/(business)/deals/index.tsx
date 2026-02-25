import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Header from '@/components/nav/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DealStatus = 'active' | 'expired' | 'draft';

interface Deal {
  dealId: string;
  title: string;
  category: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  claimCount: number;
  maxClaims: number;
  redemptionCount: number;
  status: DealStatus;
  expiresAt: string;
  district: string;
  city: string;
}

type TabKey = 'active' | 'expired' | 'draft';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function statusBadgeVariant(status: DealStatus): 'success' | 'error' | 'warning' {
  if (status === 'active') return 'success';
  if (status === 'expired') return 'error';
  return 'warning';
}

// ---------------------------------------------------------------------------
// DealCard
// ---------------------------------------------------------------------------

interface DealCardProps {
  deal: Deal;
  onPress: () => void;
}

function DealCard({ deal, onPress }: DealCardProps) {
  const { t } = useTranslation();
  const progress = deal.maxClaims > 0 ? Math.min(deal.claimCount / deal.maxClaims, 1) : 0;
  const timeLabel = formatTimeRemaining(deal.expiresAt);

  return (
    <Card onPress={onPress} className="mb-3 mx-4">
      {/* Top row: title + status badge */}
      <View className="flex-row items-start justify-between mb-2">
        <Text
          className="text-white font-semibold text-base flex-1 mr-2"
          numberOfLines={2}
        >
          {deal.title}
        </Text>
        <Badge
          label={t(`deals.${deal.status}`)}
          variant={statusBadgeVariant(deal.status)}
        />
      </View>

      {/* Category badge */}
      <View className="mb-3">
        <Badge label={deal.category} variant="neutral" />
      </View>

      {/* Claims progress bar */}
      <View className="mb-1">
        <View className="h-1.5 bg-[#2a2a30] rounded-full overflow-hidden">
          <View
            className="h-full bg-[#c8e000] rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
      </View>

      {/* Bottom row: claimed count + time remaining */}
      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-[#8a8a8f] text-xs">
          {deal.claimCount}/{deal.maxClaims} {t('deals.claims').toLowerCase()}
        </Text>
        <Text
          className={`text-xs font-medium ${
            deal.status === 'expired' ? 'text-[#ef4444]' : 'text-[#8a8a8f]'
          }`}
        >
          {timeLabel}
        </Text>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const TABS: TabKey[] = ['active', 'expired', 'draft'];

export default function MyDealsScreen() {
  const { t } = useTranslation();
  const { businessId } = useAuthStore();

  const [selectedTab, setSelectedTab] = useState<TabKey>('active');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeals = useCallback(async () => {
    if (!businessId) return;
    try {
      const data = await api.get<Deal[]>('/api/deals');
      setDeals(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      // 404 means the route isn't deployed yet or no deals exist — treat as empty
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        setDeals([]);
        setError(null);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load deals');
    }
  }, [businessId]);

  useEffect(() => {
    setLoading(true);
    fetchDeals().finally(() => setLoading(false));
  }, [fetchDeals]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDeals();
    setRefreshing(false);
  }, [fetchDeals]);

  const filtered = deals.filter((d) => d.status === selectedTab);

  const renderItem = useCallback(
    ({ item }: { item: Deal }) => (
      <DealCard
        deal={item}
        onPress={() => router.push({ pathname: `/(business)/deals/[id]`, params: { id: item.dealId, dealData: JSON.stringify(item) } })}
      />
    ),
    [],
  );

  const keyExtractor = useCallback((item: Deal) => item.dealId, []);

  const emptyMessage = selectedTab === 'active'
    ? t('deals.noneYet')
    : selectedTab === 'expired'
      ? t('deals.expired')
      : t('deals.draft');

  return (
    <View className="flex-1 bg-[#0c0c0f]">
      <Header title={t('deals.myDeals')} />

      {/* Segmented control */}
      <View className="flex-row px-4 pt-4 pb-0 border-b border-[#2a2a30]">
        {TABS.map((tab) => {
          const isActive = tab === selectedTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setSelectedTab(tab)}
              className="flex-1 items-center pb-3"
            >
              <Text
                className={`text-sm font-medium ${
                  isActive ? 'text-white' : 'text-[#8a8a8f]'
                }`}
              >
                {t(`deals.${tab}`)}
              </Text>
              {isActive && (
                <View className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#c8e000] rounded-full" />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c8e000" />
        </View>
      ) : error && deals.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-[#ef4444] text-center mb-4">{error}</Text>
          <Button
            variant="secondary"
            title={t('common.retry') ?? 'Retry'}
            onPress={() => {
              setLoading(true);
              fetchDeals().finally(() => setLoading(false));
            }}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={
            filtered.length === 0 ? { flex: 1 } : { paddingTop: 16, paddingBottom: 32 }
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c8e000"
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={emptyMessage}
              message={
                selectedTab === 'active'
                  ? t('deals.createFirst')
                  : t('common.noData')
              }
              actionLabel={selectedTab === 'active' ? t('deals.create.title', { defaultValue: 'Create Deal' }) : undefined}
              onAction={
                selectedTab === 'active'
                  ? () => router.push('/(business)/deals/create')
                  : undefined
              }
            />
          }
        />
      )}
    </View>
  );
}
