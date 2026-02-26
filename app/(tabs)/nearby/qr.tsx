import { View, Text, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';

export default function QRScreen() {
  const { t } = useTranslation();
  const { claimId, qrToken, dealTitle, business, discount, dealId, businessId } = useLocalSearchParams<{
    claimId: string;
    qrToken: string;
    dealTitle: string;
    business: string;
    discount: string;
    dealId: string;
    businessId: string;
  }>();

  const qrValue = JSON.stringify({
    claimId,
    dealId,
    businessId,
    qrToken,
    claimedAt: new Date().toISOString(),
  });

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

        <View className="rounded-3xl items-center justify-center" style={{ backgroundColor: '#ffffff', padding: 24, marginBottom: 32 }}>
          <QRCode value={qrValue} size={180} />
        </View>

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
      </View>
    </SafeAreaView>
  );
}
