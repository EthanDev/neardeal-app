import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FlameIcon, getCategoryIcon } from '@/components/icons/CategoryIcons';
import { api } from '@/lib/api';

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ── Types ────────────────────────────────────────────────────────────────────

interface Claim {
  categoryKey: string;
  business: string;
  date: string;
  amount: string;
}

interface StreakData {
  currentStreak: number;
  weekTracker: boolean[]; // 7 booleans, Mon-Sun
  recentClaims: Claim[];
}

interface SavingsData {
  monthLabel: string;
  totalSaved: number;
  target: number;
  savedDescription: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function StreakScreen() {
  const { t } = useTranslation();

  const [streak, setStreak] = useState<StreakData | null>(null);
  const [savings, setSavings] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [streakRes, savingsRes] = await Promise.all([
        api.get<StreakData>('/api/consumer/streak'),
        api.get<SavingsData>('/api/consumer/savings'),
      ]);
      setStreak(streakRes);
      setSavings(savingsRes);
    } catch (err) {
      console.error('Failed to fetch streak data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#0c0c0f] items-center justify-center">
        <ActivityIndicator size="large" color="#c8e000" />
      </View>
    );
  }

  const currentStreak = streak?.currentStreak ?? 0;
  const weekTracker = streak?.weekTracker ?? [false, false, false, false, false, false, false];
  const recentClaims = streak?.recentClaims ?? [];
  const totalSaved = savings?.totalSaved ?? 0;
  const target = savings?.target ?? 400;
  const monthLabel = savings?.monthLabel ?? '';
  const progressPct = target > 0 ? Math.min((totalSaved / target) * 100, 100) : 0;

  // Determine today's index (0=Mon, 6=Sun)
  const todayIdx = (new Date().getDay() + 6) % 7; // JS Sunday=0 -> Mon=0

  return (
    <View className="flex-1 bg-[#0c0c0f]">
      {/* Top bar */}
      <SafeAreaView edges={['top']} className="bg-[#1a1a1f] border-b border-[#2a2a30]">
        <View className="items-center justify-center py-3">
          <Text className="text-[17px] font-bold text-white">
            {t('consumer.streak.title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c8e000" />
        }
      >
        {/* Hero section */}
        <View className="bg-[#1a1a1f] items-center px-8 py-8">
          <FlameIcon size={58} color="#c8e000" />
          <Text className="text-[78px] font-bold text-[#c8e000] leading-[86px]">{currentStreak}</Text>
          <Text className="text-[16px] text-white/40 mb-5">
            {t('consumer.streak.dayStreak')}
          </Text>

          {/* Week tracker */}
          <View className="flex-row gap-2">
            {WEEK_DAYS.map((day, i) => {
              const completed = weekTracker[i];
              const isToday = i === todayIdx;
              const isFuture = i > todayIdx;

              const bgClass =
                completed
                  ? 'bg-[#c8e000]'
                  : isToday
                  ? 'bg-[rgba(200,224,0,0.22)] border-2 border-[#c8e000]'
                  : 'bg-[rgba(255,255,255,0.07)]';
              const textClass =
                completed
                  ? 'text-[#111]'
                  : isToday
                  ? 'text-[#c8e000]'
                  : 'text-[rgba(255,255,255,0.25)]';

              return (
                <View
                  key={i}
                  className={`w-[38px] h-[38px] rounded-xl items-center justify-center ${bgClass}`}
                >
                  <Text className={`text-[11px] font-bold ${textClass}`}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Savings card */}
        <View className="bg-[#1a1a1f] rounded-2xl mx-[14px] mt-[14px] p-5">
          <Text className="text-[12px] uppercase text-[#8a8a8f] tracking-wider mb-1">
            {monthLabel || t('consumer.streak.februarySavings')}
          </Text>
          <Text className="text-[46px] font-bold text-white leading-[52px]">{totalSaved} RON</Text>
          <Text className="text-[13px] text-[#8a8a8f] mt-1 mb-4">
            {t('consumer.streak.savedThisMonth')}
          </Text>

          {/* Progress bar */}
          <View className="h-[7px] bg-[#2a2a30] rounded-full overflow-hidden">
            <View className="h-full bg-[#c8e000] rounded-full" style={{ width: `${progressPct}%` }} />
          </View>
          <View className="flex-row justify-between mt-1.5">
            <Text className="text-[10px] text-[#666]">0 RON</Text>
            <Text className="text-[10px] text-[#666]">
              {t('consumer.streak.target', { amount: `${target} RON` })}
            </Text>
          </View>
        </View>

        {/* Recent claims */}
        <View className="mx-[14px] mt-[14px] mb-6">
          <Text className="text-[15px] font-bold text-white mb-3">
            {t('consumer.streak.recentClaims')}
          </Text>

          {recentClaims.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-[14px] text-[#8a8a8f]">{t('consumer.streak.noClaims')}</Text>
            </View>
          ) : (
            recentClaims.map((claim, i) => (
              <View
                key={i}
                className="bg-[#1a1a1f] rounded-2xl px-4 py-3.5 mb-[9px] flex-row items-center"
              >
                <View className="mr-3">
                  {getCategoryIcon(claim.categoryKey, 24, '#8a8a8f')}
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-white">
                    {claim.business}
                  </Text>
                  <Text className="text-[11px] text-[#8a8a8f]">
                    {claim.date}
                  </Text>
                </View>
                <Text className="text-[16px] font-bold text-[#18a056]">{claim.amount}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
