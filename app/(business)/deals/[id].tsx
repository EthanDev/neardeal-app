import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';

import Header from '@/components/nav/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DealStatus = 'active' | 'paused' | 'expired' | 'draft';
type ClaimStatus = 'claimed' | 'redeemed';

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

interface Claim {
  claimId: string;
  userId: string;
  claimedAt: string;
  status: ClaimStatus;
  redeemedAt?: string;
}

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

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateUserId(userId: string): string {
  if (userId.length <= 14) return userId;
  return `${userId.slice(0, 7)}...${userId.slice(-4)}`;
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
    <Text className="text-[#8a8a8f] text-xs font-semibold uppercase tracking-widest mb-3">
      {label}
    </Text>
  );
}

function Divider() {
  return <View className="h-px bg-[#2a2a30] my-5" />;
}

interface ClaimRowProps {
  claim: Claim;
  claimedLabel: string;
  redeemedLabel: string;
}

function ClaimRow({ claim, claimedLabel, redeemedLabel }: ClaimRowProps) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-[#2a2a30]">
      <View className="flex-1 mr-3">
        <Text className="text-white text-sm font-medium mb-0.5">
          {truncateUserId(claim.userId)}
        </Text>
        <Text className="text-[#8a8a8f] text-xs">
          {formatTimestamp(claim.claimedAt)}
        </Text>
      </View>
      <Badge
        label={claim.status === 'redeemed' ? redeemedLabel : claimedLabel}
        variant={claim.status === 'redeemed' ? 'success' : 'accent'}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxClaims, setEditMaxClaims] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchDeal = useCallback(async () => {
    if (!id) return;
    try {
      const [dealData, claimsData] = await Promise.all([
        api.get<Deal>(`/api/deals/${id}`),
        api.get<Claim[]>(`/api/deals/${id}/claims`),
      ]);
      setDeal(dealData);
      setClaims(claimsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deal');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchDeal().finally(() => setLoading(false));
  }, [fetchDeal]);

  const handleShareQr = useCallback(async () => {
    if (!deal) return;
    try {
      await Share.share({
        message: `Check out this deal: ${deal.title} - ${discountPercent(deal.originalPrice, deal.discountedPrice)}% off! Claim it on NearDeal.`,
        url: `https://neardeal.ro/deals/${deal.dealId}`,
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to share deal');
    }
  }, [deal]);

  const handleEdit = useCallback(() => {
    if (!deal) return;
    setEditTitle(deal.title);
    setEditDescription(deal.description);
    setEditMaxClaims(String(deal.maxClaims));
    setSaveSuccess(false);
    setEditing(true);
  }, [deal]);

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
    setSaveSuccess(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    setSaveSuccess(false);
    try {
      const updates: Record<string, unknown> = {};
      if (editTitle !== deal?.title) updates.title = editTitle;
      if (editDescription !== deal?.description) updates.description = editDescription;
      const parsedMaxClaims = parseInt(editMaxClaims, 10);
      if (!isNaN(parsedMaxClaims) && parsedMaxClaims !== deal?.maxClaims) updates.maxClaims = parsedMaxClaims;

      if (Object.keys(updates).length === 0) {
        setEditing(false);
        return;
      }

      const result = await api.patch<{ deal: Deal }>(`/api/deals/${id}`, updates);
      setDeal((prev) => prev ? { ...prev, ...updates, maxClaims: updates.maxClaims != null ? parsedMaxClaims : prev.maxClaims } : prev);
      setSaveSuccess(true);
      setTimeout(() => {
        setEditing(false);
        setSaveSuccess(false);
      }, 1500);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update deal');
    } finally {
      setActionLoading(false);
    }
  }, [id, actionLoading, deal, editTitle, editDescription, editMaxClaims]);

  const handlePause = useCallback(async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/deals/${id}`, { status: 'paused' });
      setDeal((prev) => prev ? { ...prev, status: 'paused' } : prev);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to pause deal');
    } finally {
      setActionLoading(false);
    }
  }, [id, actionLoading]);

  const handleActivate = useCallback(async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/deals/${id}`, { status: 'active' });
      setDeal((prev) => prev ? { ...prev, status: 'active' } : prev);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to activate deal');
    } finally {
      setActionLoading(false);
    }
  }, [id, actionLoading]);

  const handleDelete = useCallback(async () => {
    if (!id || actionLoading) return;
    Alert.alert(
      t('deals.detail.delete') ?? 'Delete Deal',
      t('deals.detail.deleteConfirm') ?? 'Are you sure you want to delete this deal?',
      [
        { text: t('common.cancel') ?? 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') ?? 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.delete(`/api/deals/${id}`);
              router.back();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete deal');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [id, actionLoading, t]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#0c0c0f]">
        <Header title={t('deals.myDeals')} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c8e000" />
        </View>
      </View>
    );
  }

  if (error && !deal) {
    return (
      <View className="flex-1 bg-[#0c0c0f]">
        <Header title={t('deals.myDeals')} showBack />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-[#ef4444] text-center mb-4">{error}</Text>
          <Button
            variant="secondary"
            title={t('common.retry') ?? 'Retry'}
            onPress={() => {
              setLoading(true);
              fetchDeal().finally(() => setLoading(false));
            }}
          />
        </View>
      </View>
    );
  }

  if (!deal) {
    return (
      <View className="flex-1 bg-[#0c0c0f]">
        <Header title={t('deals.myDeals')} showBack />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-[#8a8a8f] text-center">{t('common.noData')}</Text>
        </View>
      </View>
    );
  }

  const progress = deal.maxClaims > 0 ? Math.min(deal.claimCount / deal.maxClaims, 1) : 0;
  const discount = discountPercent(deal.originalPrice, deal.discountedPrice);
  const timeLabel = formatTimeRemaining(deal.expiresAt);
  const expiryDate = new Date(deal.expiresAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View className="flex-1 bg-[#0c0c0f]">
      <Header title={deal.title} showBack />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-5">

          {/* Status badge */}
          <View className="mb-4">
            <Badge
              label={t(`deals.${deal.status}`)}
              variant={statusBadgeVariant(deal.status)}
            />
          </View>

          {/* Title */}
          {editing ? (
            <View className="mb-2">
              <Input
                label={t('deals.detail.title') ?? 'Title'}
                value={editTitle}
                onChangeText={setEditTitle}
              />
            </View>
          ) : (
            <Text className="text-white text-2xl font-bold mb-2">{deal.title}</Text>
          )}

          {/* Category */}
          <Badge label={deal.category} variant="neutral" />

          {/* Description */}
          {editing ? (
            <View className="mt-4 mb-0">
              <Input
                label={t('deals.detail.description') ?? 'Description'}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          ) : (
            <Text className="text-[#8a8a8f] text-sm leading-5 mt-4 mb-0">
              {deal.description}
            </Text>
          )}

          <Divider />

          {/* Price section */}
          <SectionLabel label="Pricing" />
          <View className="flex-row items-end gap-3 mb-1">
            <Text className="text-[#8a8a8f] text-base line-through">
              {deal.originalPrice} RON
            </Text>
            <Text className="text-white text-3xl font-bold">
              {deal.discountedPrice} RON
            </Text>
            {discount > 0 && (
              <View className="mb-1">
                <Badge label={`-${discount}%`} variant="accent" />
              </View>
            )}
          </View>

          <Divider />

          {/* Stats row */}
          <SectionLabel label="Stats" />
          <View className="flex-row gap-3 mb-4">
            <Card className="flex-1 items-center">
              <Text className="text-white text-xl font-bold">{deal.claimCount}</Text>
              <Text className="text-[#8a8a8f] text-xs mt-0.5">{t('deals.claims')}</Text>
            </Card>
            {editing ? (
              <View className="flex-1">
                <Input
                  label={t('deals.maxClaims') ?? 'Max Claims'}
                  value={editMaxClaims}
                  onChangeText={setEditMaxClaims}
                  keyboardType="numeric"
                />
              </View>
            ) : (
              <Card className="flex-1 items-center">
                <Text className="text-white text-xl font-bold">{deal.maxClaims}</Text>
                <Text className="text-[#8a8a8f] text-xs mt-0.5">{t('deals.maxClaims')}</Text>
              </Card>
            )}
            <Card className="flex-1 items-center">
              <Text className="text-white text-xl font-bold">{deal.redemptionCount}</Text>
              <Text className="text-[#8a8a8f] text-xs mt-0.5">{t('deals.detail.redeemed')}</Text>
            </Card>
          </View>

          {/* Claims progress bar (large) */}
          <View className="mb-1">
            <View className="h-3 bg-[#2a2a30] rounded-full overflow-hidden">
              <View
                className="h-full bg-[#c8e000] rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </View>
          </View>
          <Text className="text-[#8a8a8f] text-xs mt-1.5">
            {deal.claimCount}/{deal.maxClaims} {t('deals.claims').toLowerCase()}
          </Text>

          <Divider />

          {/* Location info */}
          <SectionLabel label="Location" />
          <View className="flex-row items-center gap-2">
            <Text className="text-white text-sm font-medium">{deal.district}</Text>
            <Text className="text-[#2a2a30]">|</Text>
            <Text className="text-[#8a8a8f] text-sm">{deal.city}</Text>
          </View>

          <Divider />

          {/* Expiry */}
          <SectionLabel label={t('deals.timeLeft')} />
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-sm">{expiryDate}</Text>
            <Text
              className={`text-sm font-semibold ${
                deal.status === 'expired' ? 'text-[#ef4444]' : 'text-[#c8e000]'
              }`}
            >
              {timeLabel}
            </Text>
          </View>

          <Divider />

          {/* QR Code */}
          <SectionLabel label={t('deals.detail.shareQr')} />
          <Card className="items-center py-6">
            <View className="p-4 bg-white rounded-xl mb-4">
              <QRCode
                value={deal.dealId}
                size={160}
                backgroundColor="white"
                color="#0c0c0f"
              />
            </View>
            <Text className="text-[#8a8a8f] text-xs mb-4 text-center">
              {deal.dealId}
            </Text>
            <Button
              variant="secondary"
              title={t('deals.detail.shareQr')}
              onPress={handleShareQr}
            />
          </Card>

          <Divider />

          {/* Claim history */}
          <SectionLabel label={t('deals.detail.claimHistory')} />
          {claims.length === 0 ? (
            <Text className="text-[#8a8a8f] text-sm">{t('common.noData')}</Text>
          ) : (
            <View>
              {claims.map((claim) => (
                <ClaimRow
                  key={claim.claimId}
                  claim={claim}
                  claimedLabel={t('deals.detail.claimed')}
                  redeemedLabel={t('deals.detail.redeemed')}
                />
              ))}
            </View>
          )}

          <Divider />

          {/* Status management actions */}
          <SectionLabel label={t('deals.detail.manage') ?? 'Manage'} />
          <View className="gap-3 mb-4">
            {deal.status === 'active' && (
              <Button
                variant="secondary"
                title={t('deals.detail.pause') ?? 'Pause Deal'}
                onPress={handlePause}
                disabled={actionLoading}
                fullWidth
              />
            )}
            {(deal.status === 'paused' || deal.status === 'draft') && (
              <Button
                variant="primary"
                title={t('deals.detail.activate') ?? 'Activate Deal'}
                onPress={handleActivate}
                disabled={actionLoading}
                fullWidth
              />
            )}
            <Button
              variant="secondary"
              title={t('deals.detail.delete') ?? 'Delete Deal'}
              onPress={handleDelete}
              disabled={actionLoading}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-[#0c0c0f] border-t border-[#2a2a30]">
        {editing ? (
          <View className="gap-3">
            {saveSuccess && (
              <Text className="text-[#c8e000] text-sm text-center font-medium">
                Deal updated successfully
              </Text>
            )}
            <Button
              variant="primary"
              title={actionLoading ? (t('common.saving') ?? 'Saving...') : (t('common.save') ?? 'Save Changes')}
              onPress={handleSaveEdit}
              disabled={actionLoading}
              fullWidth
              size="lg"
            />
            <Button
              variant="secondary"
              title={t('common.cancel') ?? 'Cancel'}
              onPress={handleCancelEdit}
              disabled={actionLoading}
              fullWidth
            />
          </View>
        ) : (
          <Button
            variant="secondary"
            title={t('deals.detail.edit')}
            onPress={handleEdit}
            fullWidth
            size="lg"
          />
        )}
      </View>
    </View>
  );
}
