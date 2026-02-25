import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Header from '@/components/nav/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiCard } from '@/components/ui/KpiCard';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActivityType = 'claimed' | 'redeemed';

interface ActivityItem {
  id: string;
  dealTitle: string;
  actionType: ActivityType;
  timestamp: string;
  userName: string;
}

interface DashboardData {
  activeDeals: number;
  claimsToday: number;
  revenueImpact: number;
  redemptionRate: number;
  recentActivity: ActivityItem[];
}

// ---------------------------------------------------------------------------
// Auto-refresh interval (ms)
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `${value.toLocaleString('ro-RO')} RON`;
}

function formatPercentage(value: number): string {
  return `${value}%`;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActivityBadge({ type }: { type: ActivityType }) {
  const { t } = useTranslation();
  const isClaimed = type === 'claimed';

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        backgroundColor: isClaimed ? '#1a2a0a' : '#0a1a2a',
        borderWidth: 1,
        borderColor: isClaimed ? '#4a7a10' : '#1050a0',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: isClaimed ? '#c8e000' : '#4a9ef0',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {isClaimed ? t('deals.detail.claimed') : t('deals.detail.redeemed')}
      </Text>
    </View>
  );
}

function ActivityListItem({ item }: { item: ActivityItem }) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text
            className="text-white text-sm font-semibold mb-1"
            numberOfLines={1}
          >
            {item.dealTitle}
          </Text>
          <Text className="text-[#8a8a8f] text-xs">{item.userName}</Text>
        </View>
        <View className="items-end">
          <ActivityBadge type={item.actionType} />
          <Text className="text-[#8a8a8f] text-xs mt-1">
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <View className="px-4 pt-5">
      <View className="flex-row gap-3 mb-3">
        <View className="flex-1 h-20 bg-[#1a1a1f] rounded-xl" />
        <View className="flex-1 h-20 bg-[#1a1a1f] rounded-xl" />
      </View>
      <View className="flex-row gap-3 mb-6">
        <View className="flex-1 h-20 bg-[#1a1a1f] rounded-xl" />
        <View className="flex-1 h-20 bg-[#1a1a1f] rounded-xl" />
      </View>
      {[1, 2, 3].map((i) => (
        <View key={i} className="h-16 bg-[#1a1a1f] rounded-xl mb-3" />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Language toggle
// ---------------------------------------------------------------------------

function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggle = useCallback(() => {
    const next = currentLang === 'ro' ? 'en' : 'ro';
    i18n.changeLanguage(next);
  }, [currentLang, i18n]);

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#2a2a30',
        backgroundColor: '#1a1a1f',
      })}
      accessibilityRole="button"
    >
      <Text style={{ color: '#c8e000', fontSize: 12, fontWeight: '600' }}>
        {currentLang === 'ro' ? 'EN' : 'RO'}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Dashboard screen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const { t } = useTranslation();
  const businessId = useAuthStore((s) => s.businessId);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await api.get<DashboardData>('/api/business/dashboard');
      setData(result);
      setError(null);
    } catch (err) {
      // 404 means route not deployed yet — show empty dashboard
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        setData({ activeDeals: 0, claimsToday: 0, revenueImpact: 0, redemptionRate: 0, recentActivity: [] });
        setError(null);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDashboard().finally(() => setLoading(false));
  }, [fetchDashboard]);

  // 30s auto-refresh
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchDashboard();
    }, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-[#0c0c0f]">
        <Header
          title={t('dashboard.title')}
          rightAction={<LanguageToggle />}
        />
        <DashboardSkeleton />
      </View>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <View className="flex-1 bg-[#0c0c0f]">
        <Header
          title={t('dashboard.title')}
          rightAction={<LanguageToggle />}
        />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-[#ef4444] text-center mb-4">{error}</Text>
          <Button
            variant="secondary"
            title={t('common.retry') ?? 'Retry'}
            onPress={() => {
              setLoading(true);
              fetchDashboard().finally(() => setLoading(false));
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0c0c0f]">
      <Header
        title={t('dashboard.title')}
        rightAction={<LanguageToggle />}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c8e000"
            colors={['#c8e000']}
          />
        }
      >
        {/* KPI Grid */}
        <View className="px-4 pt-5">
          <View className="flex-row gap-3 mb-3">
            <KpiCard
              title={t('dashboard.activeDeals')}
              value={data?.activeDeals ?? 0}
              trend="up"
            />
            <KpiCard
              title={t('dashboard.totalClaims')}
              value={data?.claimsToday ?? 0}
              subtitle={t('analytics.today').toLowerCase()}
              trend="up"
            />
          </View>
          <View className="flex-row gap-3">
            <KpiCard
              title={t('dashboard.revenueSaved')}
              value={formatCurrency(data?.revenueImpact ?? 0)}
              trend="up"
            />
            <KpiCard
              title={t('dashboard.redemptionRate')}
              value={formatPercentage(data?.redemptionRate ?? 0)}
              trend="neutral"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mt-6">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                variant="primary"
                size="lg"
                title={t('dashboard.createDeal')}
                onPress={() => router.push('/(business)/deals/create')}
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                variant="secondary"
                size="lg"
                title={t('dashboard.scanQr')}
                onPress={() => router.push('/(business)/scanner')}
                fullWidth
              />
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-4 mt-8">
          <Text className="text-white text-base font-semibold mb-4">
            {t('dashboard.recentActivity')}
          </Text>

          {(data?.recentActivity ?? []).length === 0 ? (
            <EmptyState
              title={t('dashboard.noActivity')}
              message={t('common.noData')}
            />
          ) : (
            <FlatList
              data={data?.recentActivity ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ActivityListItem item={item} />}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
