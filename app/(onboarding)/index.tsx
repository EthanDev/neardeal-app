import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingHero() {
  const router = useRouter();
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stats = [
    { value: '247', label: t('onboarding.statBusinesses') },
    { value: '38', label: t('onboarding.statLive') },
    { value: '340 RON', label: t('onboarding.statSaved') },
  ];

  return (
    <View className="flex-1 bg-[#111111]">
      {/* Top-left yellow-green glow */}
      <View
        style={{
          position: 'absolute',
          top: -80,
          left: -80,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: '#c8e000',
          opacity: 0.08,
        }}
      />
      {/* Bottom-right orange glow */}
      <View
        style={{
          position: 'absolute',
          bottom: 60,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: '#ff8c00',
          opacity: 0.06,
        }}
      />

      {/* Top section */}
      <SafeAreaView edges={['top']} className="flex-1 px-6 pt-6">
        {/* Pill badge */}
        <View className="self-start mb-8">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(200,224,0,0.4)',
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: 'rgba(200,224,0,0.06)',
            }}
          >
            <Animated.View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#4ade80',
                marginRight: 8,
                opacity: pulseAnim,
              }}
            />
            <Text
              style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}
            >
              {t('onboarding.pill')}
            </Text>
          </View>
        </View>

        {/* Hero title */}
        <View className="mb-5">
          <Text style={{ fontFamily: 'Syne-Bold', fontSize: 44, color: '#ffffff', lineHeight: 50 }}>
            {t('onboarding.heroLine1')}
          </Text>
          <Text style={{ fontFamily: 'Syne-Bold', fontSize: 44, color: '#ffffff', lineHeight: 50 }}>
            {t('onboarding.heroLine2')}
          </Text>
          <Text
            style={{ fontFamily: 'Syne-Bold', fontSize: 44, color: '#c8e000', lineHeight: 50 }}
          >
            {t('onboarding.heroLine3')}
          </Text>
        </View>

        {/* Subtitle */}
        <Text
          style={{
            fontFamily: 'DMSans-Regular',
            fontSize: 16,
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 24,
            marginBottom: 32,
          }}
        >
          {t('onboarding.subtitle')}
        </Text>

        {/* Stats row */}
        <View className="flex-row gap-3">
          {stats.map((stat, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Syne-Bold',
                  fontSize: 20,
                  color: '#c8e000',
                  marginBottom: 4,
                }}
              >
                {stat.value}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans-Regular',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </SafeAreaView>

      {/* Bottom white card */}
      <View
        style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: 36,
        }}
      >
        {/* Primary CTA */}
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/walkthrough')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#c8e000',
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 17, color: '#111111' }}>
            {t('onboarding.getStarted')}
          </Text>
        </TouchableOpacity>

        {/* Sign in link */}
        <View className="flex-row justify-center mb-4">
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: '#888888' }}>
            {t('onboarding.hasAccount')}{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: '#111111' }}>
              {t('onboarding.signIn')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* I'm a business button */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/business-signup')}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#c8e000',
            borderRadius: 999,
            paddingVertical: 10,
            paddingHorizontal: 24,
            alignSelf: 'center',
          }}
        >
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#111111' }}>
            {t('onboarding.imABusiness')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
