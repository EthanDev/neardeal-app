import '../global.css';
import 'i18n/index';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from 'lib/store';
import { Toast } from 'components/ui/Toast';
import { startBackgroundLocation } from 'lib/location-service';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);

  const [fontsLoaded] = useFonts({
    'Syne-Bold': require('../assets/fonts/Syne-Bold.ttf'),
    'Syne-SemiBold': require('../assets/fonts/Syne-SemiBold.ttf'),
    'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-Bold': require('../assets/fonts/DMSans-Bold.ttf'),
    'GoogleSans-Regular': require('@expo-google-fonts/google-sans/400Regular/GoogleSans_400Regular.ttf'),
    'GoogleSans-Medium': require('@expo-google-fonts/google-sans/500Medium/GoogleSans_500Medium.ttf'),
    'GoogleSans-SemiBold': require('@expo-google-fonts/google-sans/600SemiBold/GoogleSans_600SemiBold.ttf'),
    'GoogleSans-Bold': require('@expo-google-fonts/google-sans/700Bold/GoogleSans_700Bold.ttf'),
  });

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  // Start background location tracking once authenticated
  useEffect(() => {
    if (hydrated) {
      const user = useAuthStore.getState().user;
      if (user) {
        startBackgroundLocation().catch((err) =>
          console.warn('[BackgroundLocation] Failed to start:', err)
        );
      }
    }
  }, [hydrated]);

  useEffect(() => {
    if (fontsLoaded && hydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 200,
          }}
        />
      <Toast />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
