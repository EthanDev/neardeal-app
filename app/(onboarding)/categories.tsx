import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import * as Location from 'expo-location';
import { api } from '../../lib/api';
import { useProfileStore } from '../../lib/profile-store';

function CoffeeIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 8h1a4 4 0 010 8h-1" />
      <Path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
      <Line x1="6" y1="2" x2="6" y2="4" />
      <Line x1="10" y1="2" x2="10" y2="4" />
      <Line x1="14" y1="2" x2="14" y2="4" />
    </Svg>
  );
}

function CartIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="9" cy="21" r="1" />
      <Circle cx="20" cy="21" r="1" />
      <Path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </Svg>
  );
}

function ShirtIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
    </Svg>
  );
}

function SparkleIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
      <Path d="M18 14l.7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14z" />
    </Svg>
  );
}

function DumbbellIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 6.5h11v11h-11z" fill="none" stroke="none" />
      <Line x1="8" y1="12" x2="16" y2="12" />
      <Rect x="5" y="8" width="3" height="8" rx="1" />
      <Rect x="16" y="8" width="3" height="8" rx="1" />
      <Line x1="3" y1="10" x2="5" y2="10" />
      <Line x1="3" y1="14" x2="5" y2="14" />
      <Line x1="19" y1="10" x2="21" y2="10" />
      <Line x1="19" y1="14" x2="21" y2="14" />
    </Svg>
  );
}

function TicketIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 9a3 3 0 013-3h14a3 3 0 013 3v0a3 3 0 00-3 3 3 3 0 003 3v0a3 3 0 01-3 3H5a3 3 0 01-3-3v0a3 3 0 003-3 3 3 0 00-3-3z" />
      <Line x1="13" y1="9" x2="13" y2="15" strokeDasharray="2 2" />
    </Svg>
  );
}

function PillIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10.5 1.5l-8 8a5.66 5.66 0 008 8l8-8a5.66 5.66 0 00-8-8z" />
      <Line x1="6.5" y1="13.5" x2="13.5" y2="6.5" />
    </Svg>
  );
}

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}

const CATEGORY_ICONS: Record<string, (color: string) => React.ReactNode> = {
  food: (c) => <CoffeeIcon color={c} />,
  groceries: (c) => <CartIcon color={c} />,
  fashion: (c) => <ShirtIcon color={c} />,
  beauty: (c) => <SparkleIcon color={c} />,
  fitness: (c) => <DumbbellIcon color={c} />,
  entertainment: (c) => <TicketIcon color={c} />,
  pharmacy: (c) => <PillIcon color={c} />,
  home: (c) => <HomeIcon color={c} />,
};

function LocationPinIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <Circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

interface CategoryStat {
  id: string;
  totalDeals: number;
  nearbyDeals: number;
}

const FALLBACK_CATEGORIES: CategoryStat[] = [
  { id: 'food', totalDeals: 0, nearbyDeals: 0 },
  { id: 'groceries', totalDeals: 0, nearbyDeals: 0 },
  { id: 'fashion', totalDeals: 0, nearbyDeals: 0 },
  { id: 'beauty', totalDeals: 0, nearbyDeals: 0 },
  { id: 'fitness', totalDeals: 0, nearbyDeals: 0 },
  { id: 'entertainment', totalDeals: 0, nearbyDeals: 0 },
  { id: 'pharmacy', totalDeals: 0, nearbyDeals: 0 },
  { id: 'home', totalDeals: 0, nearbyDeals: 0 },
];

const DEFAULT_SELECTED = new Set(['food', 'groceries', 'fitness']);

type LocationState = 'idle' | 'requesting' | 'granted' | 'denied';

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED));
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [categories, setCategories] = useState<CategoryStat[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const setSelectedCategories = useProfileStore((s) => s.setSelectedCategories);

  const hasLocation = locationState === 'granted';

  // Fetch category stats from API
  const fetchCategories = async (lat?: number, lng?: number) => {
    try {
      const query = lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : '';
      const res = await api.get<{ categories: CategoryStat[] }>(`/api/deals/categories${query}`);
      if (res.categories && res.categories.length > 0) {
        setCategories(res.categories);
      }
    } catch {
      // Keep fallback categories
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const requestLocation = async () => {
    setLocationState('requesting');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationState('granted');
      // Re-fetch with location for nearby counts
      try {
        const loc = await Location.getCurrentPositionAsync({});
        fetchCategories(loc.coords.latitude, loc.coords.longitude);
      } catch {
        // Location fetch failed, keep existing data
      }
    } else {
      setLocationState('denied');
    }
  };

  const toggleCategory = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-5">
        {/* Back button */}
        <Pressable onPress={() => router.back()} className="mt-2 mb-4 self-start">
          <Text style={{ fontSize: 24, color: '#111' }}>{'←'}</Text>
        </Pressable>

        {/* Progress bar */}
        <View className="h-[3px] bg-[#eee] rounded-full mb-4">
          <View className="h-full w-1/3 bg-[#c8e000] rounded-full" />
        </View>

        {/* Step label */}
        <Text className="text-xs uppercase tracking-widest text-[#7a9200] mb-2">
          {t('onboarding.categories.step')}
        </Text>

        {/* Title */}
        <Text className="text-[28px] font-bold text-black mb-2">
          {t('onboarding.categories.title')}
        </Text>

        {/* Subtitle */}
        <Text className="text-sm text-[#888] mb-5">
          {t('onboarding.categories.subtitle')}
        </Text>

        {/* Location banner */}
        {locationState !== 'granted' && (
          <Pressable
            onPress={locationState === 'requesting' ? undefined : requestLocation}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f8f7f2',
              borderWidth: 1,
              borderColor: '#e5e5e5',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: locationState === 'denied' ? '#f5f5f5' : '#f0f4c3',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LocationPinIcon color={locationState === 'denied' ? '#999' : '#7a9200'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111' }}>
                {locationState === 'denied'
                  ? t('onboarding.categories.locationDenied', { defaultValue: 'Location not available' })
                  : t('onboarding.categories.locationPrompt', { defaultValue: 'Enable location for nearby deals' })}
              </Text>
              <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                {locationState === 'denied'
                  ? t('onboarding.categories.locationDeniedSub', { defaultValue: 'Showing total deals per category instead' })
                  : t('onboarding.categories.locationPromptSub', { defaultValue: 'See how many deals are near you right now' })}
              </Text>
            </View>
            {locationState === 'requesting' ? (
              <ActivityIndicator size="small" color="#7a9200" />
            ) : locationState !== 'denied' ? (
              <View
                style={{
                  backgroundColor: '#c8e000',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#111' }}>
                  {t('onboarding.categories.enableLocation', { defaultValue: 'Enable' })}
                </Text>
              </View>
            ) : null}
          </Pressable>
        )}

        {/* Category grid */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between">
            {loading && (
              <View style={{ width: '100%', paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#7a9200" />
              </View>
            )}
            {!loading && categories.map((cat) => {
              const isSelected = selected.has(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id)}
                  className="mb-3"
                  style={{
                    width: '48%',
                    borderWidth: 2,
                    borderColor: isSelected ? '#111' : '#eee',
                    backgroundColor: isSelected ? '#111' : '#fff',
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <View className="mb-2">
                    {CATEGORY_ICONS[cat.id]?.(isSelected ? '#fff' : '#111')}
                  </View>
                  <Text
                    className="text-[13px] font-bold"
                    style={{ color: isSelected ? '#fff' : '#111' }}
                  >
                    {t(`onboarding.categories.items.${cat.id}`)}
                  </Text>
                  <Text
                    className="text-[10px] mt-1"
                    style={{
                      color: isSelected ? 'rgba(255,255,255,0.35)' : '#bbb',
                    }}
                  >
                    {hasLocation
                      ? t('onboarding.categories.nearby', { count: cat.nearbyDeals })
                      : t('onboarding.categories.totalDeals', { count: cat.totalDeals, defaultValue: '{{count}} deals' })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer */}
        <View className="py-4">
          <Text className="text-[13px] text-center text-[#888] mb-3">
            <Text className="font-bold text-black">{selected.size}</Text>{' '}
            {t('onboarding.categories.selectedCount')}
          </Text>
          <Pressable
            onPress={() => {
              setSelectedCategories(Array.from(selected));
              router.push('/(auth)/signup');
            }}
            className="bg-[#111] rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-bold text-base">
              {t('onboarding.categories.continue')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
