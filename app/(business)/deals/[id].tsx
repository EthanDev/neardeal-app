import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Header from '@/components/nav/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { KpiCard } from '@/components/ui/KpiCard';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DealStatus = 'active' | 'paused' | 'expired' | 'draft';
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
  address?: string;
  latitude?: number;
  longitude?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeRemaining(expiresAt: string, expiredLabel = 'Expired', leftLabel = 'left'): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return expiredLabel;
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${leftLabel}`;
  if (hours > 0) return `${hours}h ${minutes}m ${leftLabel}`;
  return `${minutes}m ${leftLabel}`;
}

function discountPercent(original: number, discounted: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

function statusBadgeVariant(status: DealStatus): 'success' | 'error' | 'warning' {
  if (status === 'active') return 'success';
  if (status === 'expired') return 'error';
  return 'warning';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
      {label}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DealDetailScreen() {
  const params = useLocalSearchParams<{ id: string; dealData?: string }>();
  const id = params.id;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const initialDeal = React.useMemo(() => {
    if (params.dealData) {
      try { return JSON.parse(params.dealData) as Deal; } catch { return null; }
    }
    return null;
  }, [params.dealData]);

  const [deal, setDeal] = useState<Deal | null>(initialDeal);
  const [loading, setLoading] = useState(!initialDeal);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);

  // Address autocomplete state
  const [suggestions, setSuggestions] = useState<Location.LocationGeocodedAddress[]>([]);
  const [suggestionLabels, setSuggestionLabels] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);

  const fetchDeal = useCallback(async () => {
    if (!id) return;
    try {
      const result = await api.get<Deal>(`/api/deals/${id}`);
      setDeal(result);
      setError(null);
    } catch (err) {
      // Don't overwrite existing deal on refresh failure
      if (!deal) {
        setError(err instanceof Error ? err.message : 'Failed to load deal');
      }
    }
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDeal();
    setRefreshing(false);
  }, [fetchDeal]);

  useEffect(() => {
    if (initialDeal) setLoading(false);
  }, [initialDeal]);

  // -- Address geocoding --

  const geocodeAddress = useCallback(async (text: string) => {
    if (text.length < 4) {
      setSuggestionLabels([]);
      setShowSuggestions(false);
      return;
    }
    setGeocoding(true);
    try {
      const query = text.includes('Bucharest') ? text : `${text}, Bucharest, Romania`;
      const results = await Location.geocodeAsync(query);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setEditLat(latitude);
        setEditLng(longitude);
        const reverseResults = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverseResults.length > 0) {
          const labels = reverseResults.slice(0, 3).map((r) => {
            const parts = [r.street, r.streetNumber, r.district, r.city].filter(Boolean);
            return parts.join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          });
          setSuggestionLabels(labels);
          setSuggestions(reverseResults.slice(0, 3));
          setShowSuggestions(true);
        }
        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
          500,
        );
      }
    } catch {
      // Geocoding failed silently
    } finally {
      setGeocoding(false);
    }
  }, []);

  const handleAddressChange = useCallback(
    (text: string) => {
      setEditAddress(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => geocodeAddress(text), 1200);
    },
    [geocodeAddress],
  );

  const selectSuggestion = useCallback(
    (label: string, idx: number) => {
      setEditAddress(label);
      setShowSuggestions(false);
      Keyboard.dismiss();
      const result = suggestions[idx];
      if (result) {
        if (result.city) setEditCity(result.city);
        if (result.district) setEditDistrict(result.district);
      }
    },
    [suggestions],
  );

  const handleMarkerDragEnd = useCallback(
    async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setEditLat(latitude);
      setEditLng(longitude);
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results.length > 0) {
          const r = results[0];
          const parts = [r.street, r.streetNumber, r.district, r.city].filter(Boolean);
          setEditAddress(parts.join(', ') || editAddress);
          if (r.city) setEditCity(r.city);
          if (r.district) setEditDistrict(r.district);
        }
      } catch {
        // Reverse geocode failed
      }
    },
    [editAddress],
  );

  // -- Handlers --

  const handleShareQr = useCallback(async () => {
    if (!deal) return;
    try {
      await Share.share({
        message: `Check out this deal: ${deal.title} - ${discountPercent(deal.originalPrice, deal.discountedPrice)}% off! Claim it on NearDeal.`,
        url: `https://neardeal.ro/deals/${deal.dealId}`,
      });
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), err instanceof Error ? err.message : t('deals.validation.failedToShare', 'Failed to share deal'));
    }
  }, [deal]);

  const handleEdit = useCallback(() => {
    if (!deal) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditTitle(deal.title);
    setEditDescription(deal.description);
    setEditAddress(deal.address || '');
    setEditCity(deal.city || '');
    setEditDistrict(deal.district || '');
    setEditLat(deal.latitude ?? null);
    setEditLng(deal.longitude ?? null);
    setSuggestionLabels([]);
    setShowSuggestions(false);
    setEditing(true);
  }, [deal]);

  const handleCancelEdit = useCallback(() => setEditing(false), []);

  const handleSaveEdit = useCallback(async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editTitle !== deal?.title) updates.title = editTitle;
      if (editDescription !== deal?.description) updates.description = editDescription;
      if (editAddress !== (deal?.address || '')) updates.address = editAddress;
      if (editCity !== (deal?.city || '')) updates.city = editCity;
      if (editDistrict !== (deal?.district || '')) updates.district = editDistrict;
      if (editLat != null && editLat !== deal?.latitude) updates.latitude = editLat;
      if (editLng != null && editLng !== deal?.longitude) updates.longitude = editLng;

      if (Object.keys(updates).length === 0) { setEditing(false); return; }

      await api.patch(`/api/deals/${id}`, updates);
      setDeal((prev) => prev ? { ...prev, ...updates } as Deal : prev);
      setEditing(false);
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), err instanceof Error ? err.message : t('deals.validation.failedToUpdate', 'Failed to update deal'));
    } finally {
      setActionLoading(false);
    }
  }, [id, actionLoading, deal, editTitle, editDescription, editAddress, editCity, editDistrict, editLat, editLng]);

  const handlePause = useCallback(async () => {
    if (!id || actionLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);
    try {
      await api.patch(`/api/deals/${id}`, { status: 'paused' });
      setDeal((prev) => prev ? { ...prev, status: 'paused' } : prev);
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), err instanceof Error ? err.message : t('deals.validation.failedToPause', 'Failed to pause deal'));
    } finally { setActionLoading(false); }
  }, [id, actionLoading]);

  const handleActivate = useCallback(async () => {
    if (!id || actionLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(true);
    try {
      await api.patch(`/api/deals/${id}`, { status: 'active' });
      setDeal((prev) => prev ? { ...prev, status: 'active' } : prev);
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), err instanceof Error ? err.message : t('deals.validation.failedToActivate', 'Failed to activate deal'));
    } finally { setActionLoading(false); }
  }, [id, actionLoading]);

  const handleDelete = useCallback(async () => {
    if (!id || actionLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('deals.detail.delete'),
      t('deals.detail.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.delete(`/api/deals/${id}`);
              router.back();
            } catch (err) {
              Alert.alert(t('common.error', 'Error'), err instanceof Error ? err.message : t('deals.validation.failedToDelete', 'Failed to delete deal'));
            } finally { setActionLoading(false); }
          },
        },
      ],
    );
  }, [id, actionLoading, t]);

  // -- Loading / Error / Empty states --

  if (loading && !deal) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('deals.myDeals')} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c8e000" />
        </View>
      </View>
    );
  }

  if (error && !deal) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('deals.myDeals')} showBack />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-error text-center mb-4">{error}</Text>
          <Button variant="secondary" title={t('common.retry')} onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (!deal) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('deals.myDeals')} showBack />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-text-secondary text-center">{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  // -- Computed values --

  const progress = deal.maxClaims > 0 ? Math.min(deal.claimCount / deal.maxClaims, 1) : 0;
  const discount = discountPercent(deal.originalPrice, deal.discountedPrice);
  const timeLabel = formatTimeRemaining(deal.expiresAt, t('deals.expired', 'Expired'), t('deals.timeLeft', 'left'));
  const expiryDate = new Date(deal.expiresAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  // -- Edit mode header action --

  const headerRight = !editing ? (
    <Pressable onPress={handleEdit} className="py-1 px-2">
      <Text className="text-accent text-sm font-semibold">{t('deals.detail.edit')}</Text>
    </Pressable>
  ) : undefined;

  return (
    <View className="flex-1 bg-bg">
      <Header title={deal.title} showBack rightAction={headerRight} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: editing ? 100 : 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c8e000"
            colors={['#c8e000']}
          />
        }
      >
        <View className="px-4 pt-5">

          {/* Hero: Status + Category + Title + Description */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Badge label={t(`deals.${deal.status}`)} variant={statusBadgeVariant(deal.status)} />
              <Badge label={deal.category} variant="neutral" />
            </View>

            {editing ? (
              <>
                <Input
                  label={t('deals.detail.title')}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  autoFocus
                />
                <View className="mt-3">
                  <Input
                    label={t('deals.detail.description')}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            ) : (
              <>
                <Text className="text-white text-2xl font-bold mb-2">{deal.title}</Text>
                <Text className="text-text-secondary text-sm leading-5">{deal.description}</Text>
              </>
            )}
          </View>

          {/* Edit: address */}
          {editing && (
            <View className="mb-4">
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
                {t('deals.detail.location')}
              </Text>

              <Input
                label={t('deals.detail.address', 'Address')}
                placeholder={t('deals.create.addressPlaceholder', 'Start typing an address...')}
                value={editAddress}
                onChangeText={handleAddressChange}
              />
              {geocoding && (
                <View className="flex-row items-center mt-1.5">
                  <ActivityIndicator size="small" color="#c8e000" />
                  <Text className="text-text-secondary text-xs ml-2">{t('deals.detail.findingLocation', 'Finding location...')}</Text>
                </View>
              )}

              {showSuggestions && suggestionLabels.length > 0 && (
                <View className="mt-1 bg-surface rounded-lg border border-border overflow-hidden">
                  {suggestionLabels.map((label, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        selectSuggestion(label, idx);
                      }}
                      className="px-3 py-3 border-b border-border"
                      style={idx === suggestionLabels.length - 1 ? { borderBottomWidth: 0 } : undefined}
                    >
                      <Text className="text-white text-sm" numberOfLines={2}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View className="flex-row gap-3 mt-3">
                <View className="flex-1">
                  <Input
                    label={t('deals.detail.city', 'City')}
                    value={editCity}
                    onChangeText={setEditCity}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label={t('deals.detail.district', 'District')}
                    value={editDistrict}
                    onChangeText={setEditDistrict}
                  />
                </View>
              </View>

              {editLat != null && editLng != null && (
                <View
                  className="mt-3 w-full rounded-lg overflow-hidden border border-border"
                  style={{ height: 250 }}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                >
                  <MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    initialRegion={{
                      latitude: editLat,
                      longitude: editLng,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                    userInterfaceStyle="dark"
                    zoomEnabled
                    scrollEnabled
                    pitchEnabled={false}
                    rotateEnabled={false}
                  >
                    <Marker
                      coordinate={{ latitude: editLat, longitude: editLng }}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                    >
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#c8e000', borderWidth: 3, borderColor: '#000', shadowColor: '#c8e000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 5 }} />
                        <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#c8e000', marginTop: -1 }} />
                      </View>
                    </Marker>
                  </MapView>
                  <View className="absolute bottom-2 left-2 right-2 bg-bg/80 rounded-md px-3 py-1.5">
                    <Text className="text-text-secondary text-xs text-center">
                      {t('deals.detail.dragPinAdjust', 'Drag the pin to adjust the exact location')}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* View-only sections */}
          {!editing && (
            <>
              {/* Pricing Card */}
              <Card className="mb-3">
                <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
                  {t('deals.detail.pricing')}
                </Text>
                <View className="flex-row items-baseline gap-3">
                  <Text className="text-text-secondary text-sm line-through">
                    {deal.originalPrice} RON
                  </Text>
                  <Text className="text-white text-2xl font-bold">
                    {deal.discountedPrice} RON
                  </Text>
                  {discount > 0 && <Badge label={`-${discount}%`} variant="accent" />}
                </View>
              </Card>

              {/* Stats Row */}
              <View className="flex-row gap-3 mb-3">
                <KpiCard title={t('deals.claims')} value={deal.claimCount} />
                <KpiCard title={t('deals.maxClaims')} value={deal.maxClaims} />
                <KpiCard title={t('deals.detail.redeemed')} value={deal.redemptionCount ?? 0} />
              </View>

              {/* Progress Bar */}
              <Card className="mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-text-secondary text-xs">{t('deals.detail.progress')}</Text>
                  <Text className="text-text-secondary text-xs">
                    {deal.claimCount}/{deal.maxClaims}
                  </Text>
                </View>
                <View className="h-2 bg-border rounded-full overflow-hidden">
                  <View
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${progress * 100}%` }}
                  />
                </View>
              </Card>

              {/* Location & Expiry Card */}
              <Card className="mb-3">
                <View className="flex-row items-center justify-between pb-3 border-b border-border">
                  <Text className="text-text-secondary text-xs uppercase tracking-wide">
                    {t('deals.detail.location')}
                  </Text>
                  <Text className="text-white text-sm font-medium">
                    {deal.district} · {deal.city}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between pt-3">
                  <Text className="text-text-secondary text-xs uppercase tracking-wide">
                    {t('deals.detail.expiry')}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white text-sm">{expiryDate}</Text>
                    <Text className={`text-xs font-semibold ${
                      deal.status === 'expired' ? 'text-error' : 'text-accent'
                    }`}>
                      {timeLabel}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Actions Card */}
              <Card className="mb-3">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      variant="primary"
                      size="sm"
                      title={t('dashboard.scanQr')}
                      onPress={() => router.push('/(business)/scanner')}
                      fullWidth
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      title={t('deals.detail.shareQr')}
                      onPress={handleShareQr}
                      fullWidth
                    />
                  </View>
                </View>
              </Card>
            </>
          )}

          {/* Manage Section */}
          {!editing && (
            <Card className="mb-4">
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
                {t('deals.detail.manage')}
              </Text>
              <View className="gap-2">
                {deal.status === 'active' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    title={t('deals.detail.pause')}
                    onPress={handlePause}
                    disabled={actionLoading}
                    fullWidth
                  />
                )}
                {(deal.status === 'paused' || deal.status === 'draft') && (
                  <Button
                    variant="primary"
                    size="sm"
                    title={t('deals.detail.activate')}
                    onPress={handleActivate}
                    disabled={actionLoading}
                    fullWidth
                  />
                )}
                <Button
                  variant="danger"
                  size="sm"
                  title={t('deals.detail.delete')}
                  onPress={handleDelete}
                  disabled={actionLoading}
                  fullWidth
                />
              </View>
            </Card>
          )}

        </View>
      </ScrollView>

      {/* Edit mode bottom bar */}
      {editing && (
        <View
          className="px-4 pt-3 bg-bg border-t border-border"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                variant="secondary"
                title={t('common.cancel')}
                onPress={handleCancelEdit}
                disabled={actionLoading}
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                variant="primary"
                title={actionLoading ? t('common.saving') : t('common.save')}
                onPress={handleSaveEdit}
                loading={actionLoading}
                disabled={actionLoading}
                fullWidth
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
