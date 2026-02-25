import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Linking, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MapView, { Marker } from 'react-native-maps';
import { getCategoryIcon, HeartIcon, ClockIcon, ChevronLeftIcon, NavigationIcon } from '@/components/icons/CategoryIcons';
import { api } from '@/lib/api';

interface Deal {
  dealId: string;
  title: string;
  description: string;
  category: string;
  discountValue: number;
  originalPrice: number;
  dealPrice: number;
  latitude: number;
  longitude: number;
  distance?: number;
  currentClaims: number;
  maxClaims: number;
  expiresAt: string;
  isFlash: boolean;
  isSaved?: boolean;
  hasClaimed?: boolean;
  businessId: string;
  [key: string]: unknown;
}

export default function DealDetailScreen() {
  const { t } = useTranslation();
  const { id: dealId } = useLocalSearchParams<{ id: string }>();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get<{ deal: Deal }>(`/api/deals/${dealId}`);
        if (!cancelled) {
          const d = res.deal || res;
          setDeal(d as Deal);
          setSaved(!!d.isSaved);
        }
      } catch (err: any) {
        if (!cancelled) {
          const status = err?.status || err?.statusCode;
          if (status === 404) Alert.alert(t('common.error', 'Error'), 'This deal no longer exists.');
          else if (status === 410) Alert.alert(t('common.error', 'Error'), 'This deal has expired.');
          else Alert.alert(t('common.error', 'Error'), 'Failed to load deal.');
          router.back();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [dealId]);

  const handleClaim = async () => {
    if (!deal || claiming) return;
    setClaiming(true);
    try {
      const res = await api.post<{ claim: { claimId: string; qrToken: string } }>('/api/claims', { dealId: deal.dealId });
      const claim = res.claim || res;
      router.push({
        pathname: '/(tabs)/nearby/qr',
        params: {
          claimId: claim.claimId,
          qrToken: claim.qrToken,
          dealTitle: deal.title,
          business: deal.title,
          discount: `${deal.discountValue}% OFF`,
          dealId: deal.dealId,
          businessId: deal.businessId,
        },
      });
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 409) Alert.alert(t('common.error', 'Error'), 'You have already claimed this deal.');
      else if (status === 410) Alert.alert(t('common.error', 'Error'), 'This deal has expired.');
      else Alert.alert(t('common.error', 'Error'), 'Failed to claim deal.');
    } finally {
      setClaiming(false);
    }
  };

  const handleSave = async () => {
    if (!deal) return;
    try {
      await api.post(`/api/saves/${deal.dealId}`, {});
      setSaved((prev) => !prev);
    } catch {
      // Silent fail
    }
  };

  const openNavigation = () => {
    if (!deal) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${deal.latitude},${deal.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${deal.latitude},${deal.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 items-center justify-center" style={{ backgroundColor: '#0c0c0f' }}>
        <ActivityIndicator size="large" color="#c8e000" />
      </SafeAreaView>
    );
  }

  if (!deal) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 items-center justify-center" style={{ backgroundColor: '#0c0c0f' }}>
        <Text style={{ color: '#8a8a8f', fontSize: 16 }}>Deal not found</Text>
      </SafeAreaView>
    );
  }

  const expiresMs = deal.expiresAt ? new Date(deal.expiresAt).getTime() - Date.now() : 0;
  const minsLeft = Math.max(0, Math.floor(expiresMs / 60000));
  const urgent = minsLeft < 30;
  const distM = deal.distance || 0;
  const distStr = distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`;
  const cat = (deal.category || 'other').toLowerCase();

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1" style={{ backgroundColor: '#0c0c0f' }}>
      <View className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="px-5 pt-3">
            <Pressable
              onPress={() => router.back()}
              className="rounded-full items-center justify-center"
              style={{ width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.1)' }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeftIcon size={22} color="#fff" />
            </Pressable>

            <View className="flex-row items-center mt-5">
              <View className="rounded-2xl items-center justify-center" style={{ width: 54, height: 54, backgroundColor: '#222228' }}>
                {getCategoryIcon(cat, 26, '#8a8a8f')}
              </View>
              <View className="ml-3">
                <Text style={{ fontSize: 19, fontWeight: 'bold', color: '#ffffff' }}>{deal.title}</Text>
                <Text style={{ fontSize: 12, color: '#8a8a8f', marginTop: 2 }}>{deal.category}</Text>
              </View>
            </View>

            <View className="my-5" style={{ height: 1, backgroundColor: '#2a2a30' }} />

            <View className="items-center">
              <View className="rounded-2xl items-center justify-center" style={{ backgroundColor: '#c8e000', paddingHorizontal: 32, paddingVertical: 16 }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111' }}>{deal.discountValue}% {t('consumer.detail.off', 'OFF')}</Text>
              </View>
              <View className="rounded-full mt-3 flex-row items-center" style={{ backgroundColor: urgent ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', paddingHorizontal: 14, paddingVertical: 6 }}>
                <ClockIcon size={13} color={urgent ? '#ef4444' : '#22c55e'} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: urgent ? '#ef4444' : '#22c55e', marginLeft: 4 }}>
                  {minsLeft < 60 ? `${minsLeft} min left` : `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m left`}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginTop: 24 }}>{deal.title}</Text>
            <Text style={{ fontSize: 15, color: '#8a8a8f', marginTop: 8, lineHeight: 15 * 1.65 }}>{deal.description}</Text>

            <View className="flex-row mt-6">
              <View className="flex-1 items-center">
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#8fa200' }}>{distStr}</Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{t('consumer.detail.away', 'away')}</Text>
              </View>
              <View className="flex-1 items-center">
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#ef4444' }}>{minsLeft}</Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{t('consumer.detail.minLeft', 'min left')}</Text>
              </View>
              <View className="flex-1 items-center">
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#ffffff' }}>{deal.currentClaims}</Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{t('consumer.detail.claimed', 'claimed')}</Text>
              </View>
            </View>

            <Pressable onPress={openNavigation} className="rounded-2xl overflow-hidden mt-6" style={{ height: 140 }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={{ latitude: deal.latitude, longitude: deal.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}
              >
                <Marker coordinate={{ latitude: deal.latitude, longitude: deal.longitude }} />
              </MapView>
              <View style={{ position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#c8e000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6 }}>
                <NavigationIcon size={16} color="#111" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>{t('consumer.detail.navigate', { defaultValue: 'Directions' })}</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>

        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0c0c0f', borderTopWidth: 1, borderTopColor: '#2a2a30', paddingHorizontal: 20, paddingVertical: 14 }} className="flex-row items-center">
          <Pressable onPress={handleSave} className="rounded-xl items-center justify-center" style={{ width: 52, height: 58, backgroundColor: '#222228' }}>
            <HeartIcon size={22} color={saved ? '#c8e000' : '#8a8a8f'} />
          </Pressable>
          <Pressable onPress={openNavigation} className="rounded-xl items-center justify-center ml-2" style={{ width: 52, height: 58, backgroundColor: '#222228' }}>
            <NavigationIcon size={22} color="#c8e000" />
          </Pressable>
          <Pressable
            onPress={handleClaim}
            disabled={claiming || !!deal.hasClaimed}
            className="flex-1 rounded-xl items-center justify-center ml-3"
            style={{ backgroundColor: deal.hasClaimed ? '#555' : claiming ? '#a0b800' : '#c8e000', height: 58, opacity: claiming ? 0.7 : 1 }}
          >
            {claiming ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text style={{ color: '#111', fontSize: 16, fontWeight: 'bold' }}>
                {deal.hasClaimed ? 'Already Claimed' : t('consumer.detail.claim', 'Claim Deal')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
