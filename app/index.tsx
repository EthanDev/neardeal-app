import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from 'lib/store';

export default function SplashRedirect() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const opacity = useSharedValue(0);

  function navigate() {
    const { isAuthenticated, userRole } = useAuthStore.getState();
    if (isAuthenticated) {
      if (userRole === 'business') {
        router.replace('/(business)/dashboard');
      } else {
        router.replace('/(tabs)/nearby');
      }
    } else {
      router.replace('/(onboarding)');
    }
  }

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 }, (finished) => {
      if (finished) {
        // Hold for total 1500ms (800ms fade in + 700ms hold), then navigate
        opacity.value = withTiming(
          1,
          { duration: 700 },
          (done) => {
            if (done) runOnJS(navigate)();
          },
        );
      }
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="flex-1 bg-bg items-center justify-center">
      <Animated.View style={animatedStyle} className="items-center">
        <Text className="text-accent font-heading text-5xl tracking-tight">
          NearDeal
        </Text>
        <Text className="text-text-secondary font-body text-base mt-3 text-center px-8">
          {t('splash.tagline')}
        </Text>
      </Animated.View>
    </View>
  );
}
