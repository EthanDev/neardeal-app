import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import Header from '@/components/nav/Header';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = '7d' | '30d' | '90d';

interface ClaimsDataPoint {
  date: string;
  count: number;
}

interface TopDeal {
  dealId: string;
  title: string;
  claims: number;
  redemptions: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
}

interface AnalyticsData {
  totalClaims: number;
  totalRedemptions: number;
  redemptionRate: number;
  revenue: number;
  claimsOverTime: ClaimsDataPoint[];
  topDeals: TopDeal[];
  categoryBreakdown: CategoryBreakdown[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRange(range: DateRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (range === '7d') from.setDate(from.getDate() - 7);
  else if (range === '30d') from.setDate(from.getDate() - 30);
  else from.setDate(from.getDate() - 90);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString('ro-RO')} RON`;
}

// ---------------------------------------------------------------------------
// Bar chart (View-based)
// ---------------------------------------------------------------------------

function ClaimsBarChart({ data }: { data: ClaimsDataPoint[] }) {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const BAR_MAX_HEIGHT = 120;

  return (
    <Card>
      <Text className="text-white text-sm font-semibold mb-4">Claims Over Time</Text>
      <View className="flex-row items-end justify-between" style={{ height: BAR_MAX_HEIGHT + 24 }}>
        {data.map((point, i) => {
          const height = Math.max((point.count / maxCount) * BAR_MAX_HEIGHT, 4);
          const dayLabel = point.date.slice(5); // MM-DD
          return (
            <View key={i} className="items-center flex-1 mx-0.5">
              <Text className="text-[#8a8a8f] text-[9px] mb-1">{point.count}</Text>
              <View
                className="w-full bg-[#c8e000] rounded-t"
                style={{ height, maxWidth: 28 }}
              />
              <Text className="text-[#8a8a8f] text-[9px] mt-1">{dayLabel}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Top deals list
// ---------------------------------------------------------------------------

function TopDealsList({ deals }: { deals: TopDeal[] }) {
  if (deals.length === 0) return null;

  return (
    <Card>
      <Text className="text-white text-sm font-semibold mb-3">Top Deals</Text>
      {deals.map((deal, i) => (
        <View
          key={deal.dealId}
          className={[
            'flex-row items-center justify-between py-3',
            i < deals.length - 1 ? 'border-b border-[#2a2a30]' : '',
          ].join(' ')}
        >
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-6 h-6 rounded-full bg-[#2a2a30] items-center justify-center mr-3">
              <Text className="text-[#8a8a8f] text-xs font-bold">{i + 1}</Text>
            </View>
            <Text className="text-white text-sm flex-1" numberOfLines={1}>
              {deal.title}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-white text-sm font-semibold">{deal.claims}</Text>
            <Text className="text-[#8a8a8f] text-[10px]">claims</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Category breakdown
// ---------------------------------------------------------------------------

function CategoryBreakdownChart({ data }: { data: CategoryBreakdown[] }) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  const COLORS = ['#c8e000', '#22c55e', '#4a9ef0', '#f59e0b', '#ef4444', '#a855f7', '#8a8a8f'];

  return (
    <Card>
      <Text className="text-white text-sm font-semibold mb-3">Category Breakdown</Text>
      {/* Stacked bar */}
      <View className="flex-row h-3 rounded-full overflow-hidden mb-3">
        {data.map((cat, i) => (
          <View
            key={cat.category}
            style={{
              flex: cat.count / total,
              backgroundColor: COLORS[i % COLORS.length],
            }}
          />
        ))}
      </View>
      {/* Legend */}
      <View className="gap-2">
        {data.map((cat, i) => (
          <View key={cat.category} className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-3 h-3 rounded-sm mr-2"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <Text className="text-[#8a8a8f] text-xs">{cat.category}</Text>
            </View>
            <Text className="text-white text-xs font-medium">
              {cat.count} ({Math.round((cat.count / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Date range picker
// ---------------------------------------------------------------------------

function DateRangePicker({
  selected,
  onSelect,
}: {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
}) {
  const options: { key: DateRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
  ];

  return (
    <View className="flex-row gap-2">
      {options.map((opt) => {
        const isActive = opt.key === selected;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            className={[
              'px-3 py-1.5 rounded-full border',
              isActive ? 'bg-[#c8e000]/20 border-[#c8e000]' : 'bg-[#1a1a1f] border-[#2a2a30]',
            ].join(' ')}
          >
            <Text
              className={[
                'text-xs font-semibold',
                isActive ? 'text-[#c8e000]' : 'text-[#8a8a8f]',
              ].join(' ')}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const [range, setRange] = useState<DateRange>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchAnalytics = useCallback(async (dateRange: DateRange) => {
    try {
      setError(false);
      const { from, to } = getDateRange(dateRange);
      const result = await api.get<AnalyticsData>(
        `/api/business/analytics?from=${from}&to=${to}`,
      );
      setData(result);
    } catch {
      setError(true);
      setData(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics(range).finally(() => setLoading(false));
  }, [range, fetchAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics(range);
    setRefreshing(false);
  }, [range, fetchAnalytics]);

  return (
    <View className="flex-1 bg-[#0c0c0f]">
      <Header title="Analytics" showBack />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c8e000" />
          <Text className="text-[#8a8a8f] text-sm mt-3">Loading analytics...</Text>
        </View>
      ) : error || !data ? (
        <View className="flex-1">
          <View className="px-4 pt-4">
            <DateRangePicker selected={range} onSelect={setRange} />
          </View>
          <EmptyState
            title="No data available"
            message="Analytics data could not be loaded. Pull to refresh or try a different date range."
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c8e000"
            />
          }
        >
          {/* Date range picker */}
          <View className="px-4 pt-4 pb-2">
            <DateRangePicker selected={range} onSelect={setRange} />
          </View>

          {/* KPI cards */}
          <View className="px-4 pt-3">
            <View className="flex-row gap-3 mb-3">
              <KpiCard title="Total Claims" value={data.totalClaims} trend="up" />
              <KpiCard title="Redemptions" value={data.totalRedemptions} trend="up" />
            </View>
            <View className="flex-row gap-3">
              <KpiCard
                title="Redemption Rate"
                value={`${data.redemptionRate}%`}
                trend="neutral"
              />
              <KpiCard
                title="Revenue"
                value={formatCurrency(data.revenue)}
                trend="up"
              />
            </View>
          </View>

          {/* Claims over time chart */}
          <View className="px-4 mt-6">
            <ClaimsBarChart data={data.claimsOverTime} />
          </View>

          {/* Top deals */}
          <View className="px-4 mt-4">
            <TopDealsList deals={data.topDeals} />
          </View>

          {/* Category breakdown */}
          <View className="px-4 mt-4">
            <CategoryBreakdownChart data={data.categoryBreakdown} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
