import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import SearchBar from '../../../components/search/SearchBar';
import SearchOverlay from '../../../components/search/SearchOverlay';
import { useNotificationStore } from '@/lib/notification-store';
import { useProfileStore } from '@/lib/profile-store';
import { useConsumerStore } from '@/lib/consumer-store';
import {
  FlameIcon,
  BellIcon,
  BoltIcon,
  CoffeeIcon,
  CartIcon,
  DumbbellIcon,
  ShirtIcon,
  getCategoryIcon,
} from '@/components/icons/CategoryIcons';

const BUCHAREST = { latitude: 44.4268, longitude: 26.1025, latitudeDelta: 0.015, longitudeDelta: 0.015 };

const FILTERS = [
  { key: 'all', labelKey: 'consumer.nearby.filterAll', icon: null },
  { key: 'food', labelKey: 'consumer.nearby.filterFood', icon: CoffeeIcon },
  { key: 'grocery', labelKey: 'consumer.nearby.filterGrocery', icon: CartIcon },
  { key: 'fitness', labelKey: 'consumer.nearby.filterFitness', icon: DumbbellIcon },
  { key: 'fashion', labelKey: 'consumer.nearby.filterFashion', icon: ShirtIcon },
];

// Map filter keys to matching categoryKeys
const FILTER_TO_CATEGORIES: Record<string, string[]> = {
  food: ['coffee', 'restaurant', 'bakery', 'food', 'drinks'],
  grocery: ['grocery', 'shopping'],
  fitness: ['fitness', 'gym', 'health'],
  fashion: ['fashion', 'clothing', 'beauty'],
};

export default function NearbyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const profileName = useProfileStore((s) => s.name);
  const profileAvatar = useProfileStore((s) => s.avatarUri);
  const profileHydrated = useProfileStore((s) => s.hydrated);
  const hydrateProfile = useProfileStore((s) => s.hydrate);

  const nearbyDeals = useConsumerStore((s) => s.nearbyDeals);
  const flashDeal = useConsumerStore((s) => s.flashDeal);
  const isLoadingDeals = useConsumerStore((s) => s.isLoadingDeals);
  const dealsError = useConsumerStore((s) => s.dealsError);
  const fetchNearbyDeals = useConsumerStore((s) => s.fetchNearbyDeals);
  const fetchFlashDeal = useConsumerStore((s) => s.fetchFlashDeal);

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [flashSecondsLeft, setFlashSecondsLeft] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location and fetch deals
  useEffect(() => {
    if (!profileHydrated) hydrateProfile();

    (async () => {
      let lat = BUCHAREST.latitude;
      let lng = BUCHAREST.longitude;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch {
        // Use default Bucharest location
      }

      setUserLocation({ lat, lng });
      fetchNearbyDeals(lat, lng);
      fetchFlashDeal(lat, lng);
    })();
  }, []);

  // Refetch when filter changes
  useEffect(() => {
    if (!userLocation) return;
    const category = activeFilter === 'all' ? undefined : activeFilter;
    fetchNearbyDeals(userLocation.lat, userLocation.lng, category);
  }, [activeFilter]);

  // Flash deal countdown
  useEffect(() => {
    if (flashDeal?.expiresAt) {
      const expiresMs = new Date(flashDeal.expiresAt).getTime() - Date.now();
      setFlashSecondsLeft(Math.max(0, Math.floor(expiresMs / 1000)));
    }
  }, [flashDeal]);

  useEffect(() => {
    if (flashSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setFlashSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [flashSecondsLeft]);

  const formatCountdown = (totalSeconds: number) => {
    if (totalSeconds <= 0) return 'Expired';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const flashMinutesLeft = Math.ceil(flashSecondsLeft / 60);

  const filteredDeals = activeFilter === 'all'
    ? nearbyDeals
    : nearbyDeals.filter((d) => (FILTER_TO_CATEGORIES[activeFilter] || []).includes(d.categoryKey || ''));

  const openDeal = (id: string) => {
    router.push({ pathname: '/(tabs)/nearby/[id]', params: { id } });
  };

  const handleRetry = () => {
    if (userLocation) {
      const category = activeFilter === 'all' ? undefined : activeFilter;
      fetchNearbyDeals(userLocation.lat, userLocation.lng, category);
      fetchFlashDeal(userLocation.lat, userLocation.lng);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#0c0c0f]">
      {/* Top Nav */}
      <View className="flex-row items-center justify-between bg-[#0c0c0f] px-4 py-3 border-b border-[#2a2a30]">
        <Text className="text-[21px] font-bold text-[#fff]">
          Near<Text className="text-[#8fa200]">Deal</Text>
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1a1a1f',
            borderWidth: 1,
            borderColor: '#2a2a30',
            borderRadius: 20,
            paddingHorizontal: 8,
            paddingVertical: 3,
            gap: 5,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
          <Text style={{ color: '#8a8a8f', fontSize: 10, fontWeight: '500' }}>Location active</Text>
        </View>
        <View className="flex-row items-center gap-4">
          <Pressable className="relative">
            <FlameIcon size={20} color="#fff" />
            <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400 border border-[#0c0c0f]" />
          </Pressable>
          <Pressable className="relative" onPress={() => router.push('/(tabs)/nearby/notifications')}>
            <BellIcon size={20} color="#fff" />
            {unreadCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-[#0c0c0f]" />
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/profile')} className="w-8 h-8 rounded-full bg-[#c8e000] items-center justify-center overflow-hidden">
            {profileAvatar ? (
              <Image source={{ uri: profileAvatar }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Text className="text-[11px] font-bold text-[#111]">{(profileName || 'U').charAt(0).toUpperCase()}</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <SearchBar onOpen={() => setSearchOpen(true)} />

      {/* Filter Chips */}
      <View className="bg-[#0c0c0f] border-b border-[#2a2a30]">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {FILTERS.map((f) => {
            const FilterIcon = f.icon;
            return (
              <Pressable
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                className={`flex-row items-center px-4 py-2 rounded-full border ${
                  activeFilter === f.key
                    ? 'bg-[#c8e000] border-[#c8e000]'
                    : 'bg-[#1a1a1f] border-[#2a2a30]'
                }`}
              >
                {FilterIcon && (
                  <View style={{ marginRight: 5 }}>
                    <FilterIcon size={14} color={activeFilter === f.key ? '#111' : '#8a8a8f'} />
                  </View>
                )}
                <Text
                  className={`text-[13px] font-medium ${
                    activeFilter === f.key ? 'text-[#111]' : 'text-[#8a8a8f]'
                  }`}
                >
                  {t(f.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View className="px-4 pt-4">
          <View
            className="relative overflow-hidden"
            style={{ height: mapExpanded ? 500 : 300, borderRadius: 16 }}
          >
            <MapView
              provider={PROVIDER_DEFAULT}
              style={{ flex: 1 }}
              initialRegion={BUCHAREST}
              showsUserLocation
            >
              {filteredDeals.map((deal) => (
                <Marker
                  key={deal.id}
                  coordinate={{ latitude: deal.lat, longitude: deal.lng }}
                >
                  <Callout onPress={() => openDeal(deal.id)}>
                    <Text style={{ fontWeight: 'bold' }}>{deal.business}</Text>
                    <Text>{deal.discount}% off</Text>
                  </Callout>
                </Marker>
              ))}
            </MapView>
            <Pressable onPress={() => setMapExpanded(!mapExpanded)} className="absolute bottom-3 right-3 bg-[#1a1a1f] px-3 py-1.5 rounded-full">
              <Text className="text-[12px] font-semibold text-[#fff]">{mapExpanded ? t('consumer.nearby.collapseMap', 'Collapse map') : t('consumer.nearby.expandMap')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Flash Deal */}
        {flashDeal && (
          <View className="px-4 pt-5 pb-2">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <BoltIcon size={16} color="#fff" />
                <Text className="text-[16px] font-bold text-[#fff] ml-1">{t('consumer.nearby.flashDeal')}</Text>
              </View>
              <Text className="text-[13px] text-[#8a8a8f]">{flashSecondsLeft <= 0 ? 'Expired' : t('consumer.nearby.flashTimeLeft', { time: String(flashMinutesLeft) })}</Text>
            </View>

            <Pressable onPress={() => openDeal(flashDeal.id)} className="bg-[#1a1a1f] rounded-2xl p-5">
              <View className="bg-[#c8e000] self-start px-3 py-1 rounded-full mb-3 flex-row items-center">
                <BoltIcon size={12} color="#111" />
                <Text className="text-[11px] font-bold text-[#111] ml-1">Flash -- 1 hour only</Text>
              </View>
              <Text className="text-[20px] font-bold text-white mb-1">{flashDeal.business || flashDeal.title}</Text>
              <Text className="text-[13px] text-neutral-400 mb-4">{flashDeal.description}</Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-[32px] font-extrabold text-[#c8e000]">{flashDeal.discount}%</Text>
                  <Text className="text-[13px] text-neutral-400">{t('consumer.nearby.offLimited')}</Text>
                </View>
                <View className="bg-white/10 px-3 py-1.5 rounded-lg">
                  <Text className="text-[13px] font-semibold text-white">{formatCountdown(flashSecondsLeft)}</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* Loading / Error / Empty */}
        {isLoadingDeals && (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#c8e000" />
            <Text className="text-[#8a8a8f] text-[13px] mt-3">Loading nearby deals...</Text>
          </View>
        )}

        {dealsError && !isLoadingDeals && (
          <View className="items-center py-12 px-6">
            <Text className="text-[#8a8a8f] text-[14px] text-center mb-4">{dealsError}</Text>
            <Pressable onPress={handleRetry} className="bg-[#c8e000] px-6 py-2.5 rounded-full">
              <Text className="text-[#111] font-semibold text-[13px]">Retry</Text>
            </Pressable>
          </View>
        )}

        {!isLoadingDeals && !dealsError && filteredDeals.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-[#8a8a8f] text-[14px]">No deals found nearby</Text>
          </View>
        )}

        {/* Near you now */}
        {!isLoadingDeals && filteredDeals.length > 0 && (
          <View className="px-4 pt-5 pb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[16px] font-bold text-[#fff]">{t('consumer.nearby.nearYou')}</Text>
              <Pressable>
                <Text className="text-[13px] font-semibold text-[#8fa200]">{t('consumer.nearby.viewAll')}</Text>
              </Pressable>
            </View>

            {filteredDeals.map((deal) => (
              <Pressable
                key={deal.id}
                onPress={() => openDeal(deal.id)}
                className="bg-[#1a1a1f] rounded-xl mb-3 flex-row overflow-hidden"
              >
                <View style={{ backgroundColor: deal.color, width: 5 }} />
                <View className="flex-1 p-4">
                  <View className="flex-row items-center mb-1">
                    {getCategoryIcon(deal.categoryKey || '', 13, '#8a8a8f')}
                    <Text className="text-[11px] font-semibold text-[#8a8a8f] ml-1">
                      {deal.category}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-[15px] font-bold text-[#fff]">{deal.business || deal.title}</Text>
                    <View className="bg-[#c8e000] px-2 py-0.5 rounded-md">
                      <Text className="text-[12px] font-bold text-[#111]">-{deal.discount}%</Text>
                    </View>
                  </View>
                  <Text className="text-[13px] text-[#8a8a8f] mb-2">{deal.description}</Text>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-[12px] text-[#666]">{deal.distance}</Text>
                    <Text className={`text-[12px] font-medium ${deal.urgent ? 'text-red-500' : 'text-[#666]'}`}>
                      {deal.timeLeft}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      {/* Search Overlay */}
      <SearchOverlay visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </SafeAreaView>
  );
}
