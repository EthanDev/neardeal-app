import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const Feather = require('@expo/vector-icons/Feather').default;

import Header from '@/components/nav/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanTier {
  id: string;
  name: string;
  dealLimit: number | null; // null = unlimited
  priceMonthly: number; // 0 = free
  features: string[];
}

interface SubscriptionData {
  currentPlanId: string;
  dealsUsed: number;
  dealLimit: number | null;
  renewsAt?: string;
}

// ---------------------------------------------------------------------------
// Plan tiers
// ---------------------------------------------------------------------------

const PLANS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    dealLimit: 3,
    priceMonthly: 0,
    features: [
      'Up to 3 active deals',
      'Basic analytics',
      'QR scanner',
      'Email support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    dealLimit: 10,
    priceMonthly: 29,
    features: [
      'Up to 10 active deals',
      'Full analytics dashboard',
      'QR scanner',
      'Priority email support',
      'Flash deals',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    dealLimit: 50,
    priceMonthly: 79,
    features: [
      'Up to 50 active deals',
      'Advanced analytics & exports',
      'QR scanner',
      'Priority support',
      'Flash deals',
      'Featured placement',
      'Custom branding',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    dealLimit: null,
    priceMonthly: 199,
    features: [
      'Unlimited active deals',
      'Advanced analytics & exports',
      'QR scanner',
      'Dedicated account manager',
      'Flash deals',
      'Featured placement',
      'Custom branding',
      'API access',
      'Multi-location support',
    ],
  },
];

// ---------------------------------------------------------------------------
// Plan card
// ---------------------------------------------------------------------------

function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
}: {
  plan: PlanTier;
  isCurrent: boolean;
  onUpgrade: () => void;
}) {
  const { t } = useTranslation();
  const limitLabel = plan.dealLimit === null ? t('subscription.unlimited', 'Unlimited') : `${plan.dealLimit}`;

  return (
    <Card
      className={isCurrent ? 'border-accent' : ''}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-white text-lg font-bold">{plan.name}</Text>
        {isCurrent ? <Badge label={t('subscription.currentPlanBadge', 'Current Plan')} variant="accent" /> : null}
      </View>

      <View className="flex-row items-baseline mb-4">
        {plan.priceMonthly === 0 ? (
          <Text className="text-accent text-3xl font-bold">{t('subscription.free', 'Free')}</Text>
        ) : (
          <>
            <Text className="text-accent text-3xl font-bold">{`\u20AC${plan.priceMonthly}`}</Text>
            <Text className="text-text-secondary text-sm ml-1">{t('subscription.perMonthLabel', '/month')}</Text>
          </>
        )}
      </View>

      <View className="flex-row items-center mb-4 bg-bg rounded-lg px-3 py-2">
        <Text className="text-text-secondary text-xs font-medium uppercase tracking-wide">
          {t('subscription.dealLimit', 'Deal Limit:')}
        </Text>
        <Text className="text-white text-sm font-semibold ml-2">{limitLabel}</Text>
      </View>

      <View className="gap-2 mb-4">
        {plan.features.map((feature) => (
          <View key={feature} className="flex-row items-start">
            <Feather name="check" size={14} color="#c8e000" style={{ marginTop: 2 }} />
            <Text className="text-text-secondary text-sm flex-1">{feature}</Text>
          </View>
        ))}
      </View>

      {!isCurrent ? (
        <Button
          variant={plan.priceMonthly === 0 ? 'secondary' : 'primary'}
          size="md"
          title={plan.priceMonthly === 0 ? t('subscription.downgrade', 'Downgrade') : t('subscription.upgrade', 'Upgrade')}
          onPress={onUpgrade}
          fullWidth
        />
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Usage bar
// ---------------------------------------------------------------------------

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  const { t } = useTranslation();
  const isUnlimited = limit === null;
  const progress = isUnlimited ? 0.1 : Math.min(used / (limit || 1), 1);
  const isNearLimit = !isUnlimited && limit !== null && used >= limit * 0.8;

  return (
    <Card>
      <Text className="text-white text-sm font-semibold mb-2">{t('subscription.dealUsage', 'Deal Usage')}</Text>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-text-secondary text-xs">
          {isUnlimited
            ? t('subscription.dealsUsedUnlimitedCount', '{{used}} / Unlimited deals used', { used })
            : t('subscription.dealsUsedCount', '{{used}} / {{limit}} deals used', { used, limit })}
        </Text>
        {isNearLimit ? <Badge label={t('subscription.nearLimit', 'Near limit')} variant="warning" /> : null}
      </View>
      <View className="h-2 bg-border rounded-full overflow-hidden">
        <View
          className={[
            'h-full rounded-full',
            isNearLimit ? 'bg-warning' : 'bg-accent',
          ].join(' ')}
          style={{ width: `${progress * 100}%` }}
        />
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      const result = await api.get<SubscriptionData>('/api/business/subscription');
      setSubscription(result);
    } catch {
      // Default to free plan
      setSubscription({
        currentPlanId: 'free',
        dealsUsed: 0,
        dealLimit: 3,
      });
    }
  }, []);

  useEffect(() => {
    fetchSubscription().finally(() => setLoading(false));
  }, [fetchSubscription]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSubscription();
    setRefreshing(false);
  }, [fetchSubscription]);

  const handleUpgrade = useCallback(async (planId: string) => {
    try {
      setUpgrading(true);
      const result = await api.post<{ checkoutUrl: string }>('/api/business/checkout', { planId });
      if (result.checkoutUrl) {
        await Linking.openURL(result.checkoutUrl);
      }
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), t('subscription.checkoutError', 'Failed to start checkout. Please try again.'));
    } finally {
      setUpgrading(false);
    }
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('subscription.title', 'Subscription')} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c8e000" />
        </View>
      </View>
    );
  }

  const currentPlan = PLANS.find((p) => p.id === subscription?.currentPlanId) ?? PLANS[0];

  return (
    <View className="flex-1 bg-bg">
      <Header title="Subscription" showBack />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 }}
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
        {/* Current usage */}
        {subscription ? (
          <View className="mb-6">
            <UsageBar used={subscription.dealsUsed} limit={subscription.dealLimit} />
            {subscription.renewsAt ? (
              <Text className="text-text-secondary text-xs mt-2 text-center">
                {t('subscription.renewsOn', 'Renews on {{date}}', { date: new Date(subscription.renewsAt).toLocaleDateString('ro-RO') })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Plan tiers */}
        <Text className="text-white text-lg font-semibold mb-4">{t('subscription.choosePlan', 'Choose Your Plan')}</Text>
        <View className="gap-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlan.id}
              onUpgrade={() => handleUpgrade(plan.id)}
            />
          ))}
        </View>

        {/* Footer note */}
        <Card className="mt-6">
          <Text className="text-text-secondary text-xs text-center leading-4">
            {t('subscription.planFooter', 'All plans include access to the QR scanner and deal management tools. Upgrade or downgrade at any time. Changes take effect immediately.')}
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
