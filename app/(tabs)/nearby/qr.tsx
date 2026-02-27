import { View, Text, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import QRCode from 'react-native-qrcode-svg';

export default function QRScreen() {
  const { t } = useTranslation();
  const { claimId, qrToken, dealTitle, business, discount, dealId, businessId, expiresAt, createdAt } = useLocalSearchParams<{
    claimId: string;
    qrToken: string;
    dealTitle: string;
    business: string;
    discount: string;
    dealId: string;
    businessId: string;
    expiresAt: string;
    createdAt: string;
  }>();

  const qrValue = JSON.stringify({
    claimId,
    dealId,
    businessId,
    qrToken,
    claimedAt: createdAt || new Date().toISOString(),
  });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const remainingMs = expiresAt ? new Date(expiresAt).getTime() - now : null;
  const isExpired = remainingMs !== null && remainingMs <= 0;
  const remainingMins = remainingMs !== null ? Math.max(0, Math.floor(remainingMs / 60000)) : null;
  const remainingSecs = remainingMs !== null ? Math.max(0, Math.floor((remainingMs % 60000) / 1000)) : null;

  const countdownText = useMemo(() => {
    if (remainingMs === null) return null;
    if (isExpired) return null;
    if (remainingMins! >= 60) {
      const h = Math.floor(remainingMins! / 60);
      const m = remainingMins! % 60;
      return `Expires in ${h}h ${m}m`;
    }
    return `Expires in ${remainingMins}m ${remainingSecs}s`;
  }, [remainingMs, isExpired, remainingMins, remainingSecs]);

  const countdownColor = remainingMins !== null && remainingMins < 5 ? '#ef4444' : remainingMins !== null && remainingMins < 30 ? '#f59e0b' : 'rgba(255,255,255,0.5)';

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1" style={{ backgroundColor: '#111111' }}>
      <View className="flex-1 items-center justify-center px-6">
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
          {t('consumer.qr.yourDeal')}
        </Text>

        <Text style={{ fontSize: 28, fontFamily: 'GoogleSans-Bold', color: '#ffffff', marginBottom: 4, textAlign: 'center' }}>
          {business}
        </Text>

        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, textAlign: 'center' }}>
          {dealTitle}
        </Text>

        <View className="rounded-3xl items-center justify-center" style={{ backgroundColor: '#ffffff', padding: 24, marginBottom: 16, opacity: isExpired ? 0.3 : 1 }}>
          <QRCode value={qrValue} size={180} />
        </View>

        {countdownText && (
          <Text style={{ fontSize: 14, fontFamily: 'GoogleSans-SemiBold', color: countdownColor, marginBottom: 16 }}>
            {countdownText}
          </Text>
        )}

        <Text style={{ fontSize: 48, fontFamily: 'GoogleSans-Bold', color: '#c8e000', marginBottom: 12 }}>
          {discount}
        </Text>

        {claimId && (
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
            {claimId}
          </Text>
        )}

        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 40 }}>
          {t('consumer.qr.expiry')}
        </Text>

        <Pressable
          onPress={() => router.replace('/(tabs)/nearby')}
          className="rounded-2xl w-full items-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 16 }}
        >
          <Text style={{ color: '#ffffff', fontSize: 15, fontFamily: 'GoogleSans-SemiBold' }}>
            {t('consumer.qr.done', { defaultValue: 'Done' })}
          </Text>
        </Pressable>

        {isExpired && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
            <Text style={{ fontSize: 20, fontFamily: 'GoogleSans-Bold', color: '#ef4444', textAlign: 'center' }}>
              This deal has expired
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
