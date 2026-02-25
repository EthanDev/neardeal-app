import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

const TAB_ORDER = ['dashboard', 'deals', 'create', 'scanner', 'profile'];

const TAB_ICONS: Record<string, string> = {
  dashboard: '⌂',
  deals: '%',
  create: '+',
  scanner: '▦',
  profile: '◯',
};

const TAB_LABEL_KEYS: Record<string, string> = {
  dashboard: 'nav.home',
  deals: 'nav.deals',
  create: 'nav.create',
  scanner: 'nav.scanner',
  profile: 'nav.profile',
};

const TAB_LABEL_FALLBACKS: Record<string, string> = {
  dashboard: 'Acasă',
  deals: 'Oferte',
  create: 'Creează',
  scanner: 'Scanează',
  profile: 'Profil',
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();

  const sortedRoutes = TAB_ORDER.map((name) =>
    state.routes.find((r) => r.name === name),
  ).filter(Boolean) as typeof state.routes;

  return (
    <View style={{ backgroundColor: '#0c0c0f', borderTopWidth: 1, borderTopColor: '#2a2a30' }}>
      <SafeAreaView edges={['bottom']}>
        <View className="flex-row items-end h-16 px-2">
          {sortedRoutes.map((route) => {
            const isFocused = state.routes[state.index].name === route.name;
            const isCreate = route.name === 'create';
            const label = t(TAB_LABEL_KEYS[route.name], { defaultValue: TAB_LABEL_FALLBACKS[route.name] });
            const icon = TAB_ICONS[route.name] ?? '•';

            function onPress() {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }

            if (isCreate) {
              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  className="flex-1 items-center justify-end pb-2"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={label}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#c8e000',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 4,
                      // Raise above the bar
                      transform: [{ translateY: -16 }],
                      shadowColor: '#c8e000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <Text style={{ fontSize: 28, color: '#0c0c0f', lineHeight: 32 }}>+</Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 10,
                      color: isFocused ? '#c8e000' : '#8a8a8f',
                      fontFamily: 'DMSans-Medium',
                      marginTop: -12,
                    }}
                  >
                    Create Deal
                  </Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                className="flex-1 items-center justify-end pb-2"
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={label}
              >
                <View className="items-center justify-center w-6 h-6 mb-1">
                  <Text style={{ fontSize: 18, color: isFocused ? '#c8e000' : '#8a8a8f' }}>
                    {icon}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    color: isFocused ? '#c8e000' : '#8a8a8f',
                    fontFamily: 'DMSans-Medium',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}
