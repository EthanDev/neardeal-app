import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  getCategoryIcon,
  HeartIcon,
  CompassIcon,
  CoffeeIcon,
  CoinIcon,
  MedalIcon,
  FlameIcon,
  CheckIcon,
} from '@/components/icons/CategoryIcons';
import { api } from '@/lib/api';
import { getBusinessLogo } from '@/lib/businessLogos';

// ── Types ────────────────────────────────────────────────────────────────────

interface ClaimedDeal {
  id: string;
  business: string;
  deal: string;
  discount: string;
  color: string;
  date: string;
  distance: string;
  status: 'redeemed' | 'claimed' | 'expired';
  saved: number;
  section: string;
  businessLogo?: string;
}

interface SavedDeal {
  id: string;
  business: string;
  desc: string;
  discount: string;
  distance: string;
  categoryKey: string;
  color: string;
  businessLogo?: string;
}

interface Badge {
  name: string;
  iconKey: string;
  desc: string;
  unlocked: boolean;
}

// Raw API response types (backend shape)
interface RawSavesResponse {
  saves: Array<{
    dealId: string;
    savedAt: string;
    deal: {
      dealId: string;
      title: string;
      description?: string;
      businessName?: string;
      discountValue?: number;
      category?: string;
      latitude?: number;
      longitude?: number;
    } | null;
  }>;
}

interface RawStreakResponse {
  currentStreak: number;
  longestStreak: number;
  weekTracker: boolean[];
  recentClaims: Array<{
    claimId: string;
    dealId: string;
    dealTitle: string;
    dealDiscount?: number;
    status: string;
    claimedAt: string;
  }>;
  totalClaims?: number;
}

// ── Icon map for badges ──────────────────────────────────────────────────────

const BADGE_ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  compass: CompassIcon,
  coffee: CoffeeIcon,
  coin: CoinIcon,
  medal: MedalIcon,
  flame: FlameIcon,
};

// ── Tabs ────────────────────────────────────────────────────────────────────────

type Tab = 'claimed' | 'saved' | 'passport';

// ── Component ───────────────────────────────────────────────────────────────────

export default function MyDealsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('claimed');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Data state
  const [claimedDeals, setClaimedDeals] = useState<ClaimedDeal[]>([]);
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);
  const [stamps, setStamps] = useState<(string | null)[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [summary, setSummary] = useState({ claimed: 0, ronSaved: 0, avgDeal: 0 });

  // Loading / refresh state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [savesRes, streakRes] = await Promise.all([
        api.get<RawSavesResponse>('/api/saves'),
        api.get<RawStreakResponse>('/api/consumer/streak'),
      ]);

      // Map saves to UI shape
      const CATEGORY_COLORS: Record<string, string> = {
        food: '#ef4444', drinks: '#f59e0b', coffee: '#8B4513',
        shopping: '#3b82f6', beauty: '#ec4899', fitness: '#22c55e',
        entertainment: '#8b5cf6', services: '#06b6d4', default: '#8fa200',
      };
      // Map deal titles to business logos for claimed deals
      const TITLE_TO_LOGO: Record<string, string> = {
        '50% Off Specialty Latte': 'origo',
        '2-for-1 Craft Beers': 'shift',
        '30% Off Traditional Lunch': 'manuc',
        '25% Off Weekend Brunch': 'artist',
        'Free Bouquet Upgrade': 'floraria',
        '40% Off 60-Min Massage': 'zen',
        'Buy 1 Get 1 Fresh Pastry': 'paine',
      };
      const mapped: SavedDeal[] = (savesRes.saves ?? [])
        .filter((s) => s.deal)
        .map((s) => {
          const d = s.deal!;
          const cat = (d.category ?? 'default').toLowerCase();
          return {
            id: d.dealId,
            business: d.businessName ?? d.title,
            desc: d.description ?? d.title,
            discount: d.discountValue ? `-${d.discountValue}%` : 'Deal',
            distance: '',
            categoryKey: cat,
            color: CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default,
            businessLogo: (d as any).businessLogo,
          };
        });
      setSavedDeals(mapped);

      // Map claims to UI shape
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Deduplicate claims by claimId
      const seen = new Set<string>();
      const uniqueClaims = (streakRes.recentClaims ?? []).filter((c) => {
        if (seen.has(c.claimId)) return false;
        seen.add(c.claimId);
        return true;
      });

      const claimedMapped: ClaimedDeal[] = uniqueClaims.map((c) => {
        const dateStr = (c.claimedAt ?? '').split('T')[0];
        const section = dateStr === todayStr ? 'today' : dateStr === yesterdayStr ? 'yesterday' : 'earlier';
        const color = CATEGORY_COLORS.default;
        const dealTitle = c.dealTitle ?? 'Deal';
        return {
          id: c.claimId,
          business: dealTitle,
          deal: dealTitle,
          discount: c.dealDiscount ? `-${c.dealDiscount}%` : 'Deal',
          color,
          date: dateStr,
          distance: '',
          status: (c.status as ClaimedDeal['status']) ?? 'claimed',
          saved: c.dealDiscount ?? 0,
          section,
          businessLogo: TITLE_TO_LOGO[dealTitle],
        };
      });
      setClaimedDeals(claimedMapped);

      const totalClaimed = uniqueClaims.length;
      const totalSaved = uniqueClaims.reduce((sum, c) => sum + (c.dealDiscount ?? 0), 0);
      setSummary({
        claimed: totalClaimed,
        ronSaved: totalSaved,
        avgDeal: totalClaimed > 0 ? Math.round(totalSaved / totalClaimed) : 0,
      });

      // Stamps from weekTracker
      const stampsMapped = (streakRes.weekTracker ?? []).map((active) => active ? 'flame' : null);
      setStamps(stampsMapped);

      // Default badges
      setBadges([
        { name: 'Explorer', iconKey: 'compass', desc: 'Claim your first deal', unlocked: totalClaimed >= 1 },
        { name: 'Regular', iconKey: 'coffee', desc: 'Claim 5 deals', unlocked: totalClaimed >= 5 },
        { name: 'Saver', iconKey: 'coin', desc: 'Save 100 RON', unlocked: totalSaved >= 100 },
        { name: 'Streak Master', iconKey: 'flame', desc: '7-day streak', unlocked: streakRes.currentStreak >= 7 },
        { name: 'Champion', iconKey: 'medal', desc: 'Claim 20 deals', unlocked: totalClaimed >= 20 },
      ]);
    } catch (err) {
      console.error('Failed to fetch my-deals data', err);
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'claimed', label: t('consumer.myDeals.claimed') },
    { key: 'saved', label: t('consumer.myDeals.saved') },
    { key: 'passport', label: t('consumer.myDeals.passport') },
  ];

  // ── Helpers ──

  const sectionTitle = (key: string) => {
    if (key === 'today') return t('consumer.myDeals.today');
    if (key === 'yesterday') return t('consumer.myDeals.yesterday');
    return t('consumer.myDeals.earlier');
  };

  const statusLabel = (s: string) => {
    if (s === 'redeemed') return t('consumer.myDeals.redeemed');
    if (s === 'claimed') return t('consumer.myDeals.notRedeemed');
    return t('consumer.myDeals.expired');
  };

  const statusColor = (s: string) =>
    s === 'redeemed' ? '#18a056' : s === 'claimed' ? '#d93025' : '#666';

  // ── Sections for claimed deals ──

  const sections = ['today', 'yesterday', 'earlier'] as const;

  // ── Render ────

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-[#0c0c0f] items-center justify-center">
        <ActivityIndicator size="large" color="#c8e000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#0c0c0f]">
      {/* Sticky header */}
      <View className="bg-[#1a1a1f] px-5 pb-0 pt-2">
        {/* Title row */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-[21px] font-bold text-white">
            {t('consumer.myDeals.titlePrefix')}{' '}
            <Text className="text-[#8fa200]">{t('consumer.myDeals.titleHighlight')}</Text>
          </Text>
          <Text className="text-[13px] text-[#8a8a8f]">{t('consumer.myDeals.monthLabel')}</Text>
        </View>

        {/* Tab row */}
        <View className="flex-row">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="flex-1 items-center pb-3"
                style={{
                  borderBottomWidth: 2.5,
                  borderBottomColor: active ? '#c8e000' : 'transparent',
                }}
              >
                <Text
                  className="text-[14px] font-semibold"
                  style={{ color: active ? '#ffffff' : '#666' }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c8e000" />
        }
      >
        {activeTab === 'claimed' && <ClaimedTab />}
        {activeTab === 'saved' && <SavedTab />}
        {activeTab === 'passport' && <PassportTab />}
      </ScrollView>
    </SafeAreaView>
  );

  // ── CLAIMED TAB ──────────────────────────────────────────────────────────────

  function ClaimedTab() {
    if (claimedDeals.length === 0) {
      return (
        <View className="px-5 pt-16 items-center">
          <Text className="text-[15px] text-[#8a8a8f]">{t('consumer.myDeals.noClaimedDeals')}</Text>
        </View>
      );
    }

    return (
      <View className="px-5 pt-4">
        {/* Summary strip */}
        <View className="flex-row bg-[#1a1a1f] rounded-2xl overflow-hidden mb-5">
          <View className="flex-1 items-center py-3">
            <Text className="text-[20px] font-bold text-white">{summary.claimed}</Text>
            <Text className="text-[10px] font-semibold tracking-wider text-[#8a8a8f] mt-0.5">
              {t('consumer.myDeals.summaryClaimed')}
            </Text>
          </View>
          <View className="w-[1px] bg-[#2a2a30]" />
          <View className="flex-1 items-center py-3">
            <Text className="text-[20px] font-bold text-[#18a056]">{summary.ronSaved}</Text>
            <Text className="text-[10px] font-semibold tracking-wider text-[#8a8a8f] mt-0.5">
              {t('consumer.myDeals.ronSaved')}
            </Text>
          </View>
          <View className="w-[1px] bg-[#2a2a30]" />
          <View className="flex-1 items-center py-3">
            <Text className="text-[20px] font-bold text-[#8fa200]">{summary.avgDeal}</Text>
            <Text className="text-[10px] font-semibold tracking-wider text-[#8a8a8f] mt-0.5">
              {t('consumer.myDeals.avgDeal')}
            </Text>
          </View>
        </View>

        {/* Deal sections */}
        {sections.map((section) => {
          const deals = claimedDeals.filter((d) => d.section === section);
          if (deals.length === 0) return null;
          return (
            <View key={section} className="mb-4">
              <Text className="text-[13px] font-semibold text-[#8a8a8f] mb-2 uppercase tracking-wider">
                {sectionTitle(section)}
              </Text>
              {deals.map((deal) => (
                <ClaimedCard key={deal.id} deal={deal} />
              ))}
            </View>
          );
        })}
      </View>
    );
  }

  function ClaimedCard({ deal }: { deal: ClaimedDeal }) {
    const expanded = expandedId === deal.id;
    const isExpired = deal.status === 'expired';
    const logo = getBusinessLogo(deal.businessLogo);

    return (
      <Pressable
        onPress={() => setExpandedId(expanded ? null : deal.id)}
        className="bg-[#1a1a1f] rounded-2xl mb-3 overflow-hidden"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <View className="flex-row items-center px-4 py-3">
          {/* Business logo */}
          {logo ? (
            <Image
              source={logo}
              style={{ width: 42, height: 42, borderRadius: 10 }}
              className="mr-3"
            />
          ) : (
            <View className="w-[42px] h-[42px] rounded-[10px] bg-[#2a2a30] items-center justify-center mr-3">
              <Text className="text-[16px] font-bold text-[#8a8a8f]">{deal.business.charAt(0)}</Text>
            </View>
          )}

          {/* Main content */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-[15px] font-bold text-white">{deal.business}</Text>
                <Text className="text-[12px] text-[#8a8a8f] mt-0.5">{deal.deal}</Text>
              </View>
              <View
                className="px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: deal.color + '18' }}
              >
                <Text className="text-[13px] font-bold" style={{ color: deal.color }}>
                  {deal.discount}
                </Text>
              </View>
            </View>

            {/* Meta row */}
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-[11px] text-[#666]">
                {deal.date} -- {deal.distance}
              </Text>
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: statusColor(deal.status) + '14' }}
              >
                <Text
                  className="text-[10px] font-semibold"
                  style={{ color: statusColor(deal.status) }}
                >
                  {statusLabel(deal.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Expandable bottom */}
        {expanded && (
          <View className="flex-row items-center justify-between px-4 py-3 border-t border-[#2a2a30]">
            <Text className="text-[14px] font-bold text-[#18a056]">
              -{deal.saved} RON {t('consumer.myDeals.saved')}
            </Text>
            {isExpired ? (
              <Text className="text-[13px] font-semibold text-[#666]">
                {t('consumer.myDeals.expired')}
              </Text>
            ) : (
              <TouchableOpacity className="bg-[#c8e000] px-4 py-2 rounded-xl">
                <Text className="text-[#111] text-[13px] font-semibold">
                  {t('consumer.myDeals.viewQr')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Pressable>
    );
  }

  // ── SAVED TAB ────────────────────────────────────────────────────────────────

  function SavedTab() {
    if (savedDeals.length === 0) {
      return (
        <View className="px-5 pt-16 items-center">
          <Text className="text-[15px] text-[#8a8a8f]">{t('consumer.myDeals.noSavedDeals')}</Text>
        </View>
      );
    }

    return (
      <View className="px-5 pt-4">
        <Text className="text-[14px] text-[#8a8a8f] mb-3">
          {savedDeals.length} {t('consumer.myDeals.savedDeals')}
        </Text>
        {savedDeals.map((deal) => (
          <View
            key={deal.id}
            className="bg-[#1a1a1f] rounded-2xl mb-3 flex-row items-center px-4 py-3.5"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
          >
            {/* Business logo */}
            {getBusinessLogo(deal.businessLogo) ? (
              <Image
                source={getBusinessLogo(deal.businessLogo)!}
                style={{ width: 46, height: 46, borderRadius: 12 }}
                className="mr-3"
              />
            ) : (
              <View
                className="w-[46px] h-[46px] rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: deal.color + '18' }}
              >
                {getCategoryIcon(deal.categoryKey, 20, deal.color)}
              </View>
            )}

            {/* Content */}
            <View className="flex-1 mr-3">
              <Text className="text-[15px] font-bold text-white">{deal.business}</Text>
              <Text className="text-[12px] text-[#8a8a8f] mt-0.5">{deal.desc}</Text>
              <View className="flex-row items-center mt-1.5">
                <View
                  className="px-2 py-0.5 rounded-md mr-2"
                  style={{ backgroundColor: deal.color + '18' }}
                >
                  <Text className="text-[11px] font-bold" style={{ color: deal.color }}>
                    {deal.discount}
                  </Text>
                </View>
                <Text className="text-[11px] text-[#666]">{deal.distance}</Text>
              </View>
            </View>

            {/* Heart */}
            <TouchableOpacity>
              <HeartIcon size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }

  // ── PASSPORT TAB ─────────────────────────────────────────────────────────────

  function PassportTab() {
    const filledCount = stamps.filter(Boolean).length;

    if (stamps.length === 0 && badges.length === 0) {
      return (
        <View className="px-5 pt-16 items-center">
          <Text className="text-[15px] text-[#8a8a8f]">{t('consumer.myDeals.noPassportData')}</Text>
        </View>
      );
    }

    return (
      <View className="px-5 pt-4">
        {/* Passport card */}
        <View
          className="bg-[#1a1a1f] rounded-2xl p-5 mb-4"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Text className="text-[10px] font-bold tracking-[3px] text-[#666] mb-3">
            {t('consumer.myDeals.passportTitle')}
          </Text>
          <Text className="text-[12px] text-[#666] mb-5">
            {t('consumer.myDeals.memberSince')}
          </Text>

          {/* Stamp grid */}
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {stamps.map((stamp, i) => (
              <View
                key={i}
                className="w-[44px] h-[44px] rounded-xl items-center justify-center"
                style={
                  stamp
                    ? { backgroundColor: 'rgba(255,255,255,0.08)' }
                    : {
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderStyle: 'dashed',
                      }
                }
              >
                {stamp && getCategoryIcon(stamp, 20, '#fff')}
              </View>
            ))}
          </View>

          {/* Count */}
          <Text className="text-[13px] text-[#8a8a8f] mt-4">
            <Text className="font-bold text-white">{filledCount}</Text>{' '}
            {t('consumer.myDeals.stampsCount', { count: filledCount })}
          </Text>
        </View>

        {/* Milestone card */}
        <View
          className="bg-[#1a1a1f] rounded-2xl p-5 mb-4"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <Text className="text-[12px] font-semibold text-[#8a8a8f] uppercase tracking-wider mb-2">
            {t('consumer.myDeals.nextMilestone')}
          </Text>
          <View className="flex-row items-center mb-3">
            <View className="mr-2">
              <MedalIcon size={24} color="#c8a227" />
            </View>
            <View>
              <Text className="text-[16px] font-bold text-white">
                {t('consumer.myDeals.goldBadge')}
              </Text>
              <Text className="text-[12px] text-[#8a8a8f]">
                {t('consumer.myDeals.goldDesc')}
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View className="h-[6px] bg-[#2a2a30] rounded-full overflow-hidden mb-1.5">
            <View
              className="h-full rounded-full bg-[#8fa200]"
              style={{ width: `${(filledCount / 20) * 100}%` }}
            />
          </View>
          <Text className="text-[11px] text-[#666]">
            {filledCount}/20 {t('consumer.myDeals.stamps')}
          </Text>
        </View>

        {/* All badges */}
        <Text className="text-[13px] font-semibold text-[#8a8a8f] uppercase tracking-wider mb-3">
          {t('consumer.myDeals.allBadges')}
        </Text>
        {badges.map((badge) => {
          const BadgeIcon = BADGE_ICON_MAP[badge.iconKey] ?? MedalIcon;
          return (
            <View
              key={badge.name}
              className="bg-[#1a1a1f] rounded-2xl flex-row items-center px-4 py-3.5 mb-2.5"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
                opacity: badge.unlocked ? 1 : 0.45,
              }}
            >
              <View className="mr-3">
                <BadgeIcon size={24} color={badge.unlocked ? '#fff' : '#666'} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-white">{badge.name}</Text>
                <Text className="text-[12px] text-[#8a8a8f]">{badge.desc}</Text>
              </View>
              {badge.unlocked && <CheckIcon size={14} color="#18a056" />}
            </View>
          );
        })}
      </View>
    );
  }
}
