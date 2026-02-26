import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

const Feather = require('@expo/vector-icons/Feather').default;

const TAB_ORDER = ['dashboard', 'deals', 'create', 'scanner', 'profile'];

const TAB_ICONS: Record<string, string> = {
  dashboard: 'home',
  deals: 'percent',
  create: 'plus',
  scanner: 'grid',
  profile: 'user',
};

const TAB_LABEL_KEYS: Record<string, string> = {
  dashboard: 'nav.home',
  deals: 'nav.deals',
  create: 'nav.create',
  scanner: 'nav.scanner',
  profile: 'nav.profile',
};

const TAB_LABEL_FALLBACKS: Record<string, string> = {
  dashboard: 'Home',
  deals: 'Deals',
  create: 'Create Deal',
  scanner: 'Scanner',
  profile: 'Profile',
};

export default function BusinessTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();

  const sortedRoutes = TAB_ORDER.map((name) =>
    state.routes.find((r) => r.name === name),
  ).filter(Boolean) as typeof state.routes;

  return (
    <View style={{ backgroundColor: '#0c0c0f', borderTopWidth: 1, borderTopColor: '#2a2a30' }}>
      <SafeAreaView edges={['bottom']}>
        <View className="flex-row items-end px-2" style={{ height: 72, paddingBottom: 4 }}>
          {sortedRoutes.map((route) => {
            const isFocused = state.routes[state.index].name === route.name;
            const isCreate = route.name === 'create';
            const label = t(TAB_LABEL_KEYS[route.name], { defaultValue: TAB_LABEL_FALLBACKS[route.name] });
            const iconName = TAB_ICONS[route.name] ?? 'circle';

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
                  className="flex-1 items-center justify-end"
                  style={{ paddingBottom: 8 }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={label}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
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
                      transform: [{ translateY: -12 }],
                      shadowColor: '#c8e000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <Feather name="plus" size={28} color="#0c0c0f" />
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      color: isFocused ? '#c8e000' : '#8a8a8f',
                      fontFamily: 'GoogleSans-Medium',
                      marginTop: -8,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                className="flex-1 items-center justify-end"
                style={{ paddingBottom: 8 }}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={label}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <View className="items-center justify-center mb-1.5">
                  <Feather name={iconName} size={24} color={isFocused ? '#c8e000' : '#8a8a8f'} />
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: isFocused ? '#c8e000' : '#8a8a8f',
                    fontFamily: 'GoogleSans-Medium',
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
