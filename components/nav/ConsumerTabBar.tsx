import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { MapPinIcon, FlameIcon, TagIcon, UserIcon } from '@/components/icons/CategoryIcons';

const TAB_ORDER = ['nearby', 'streak', 'my-deals', 'profile'];

const TAB_ICONS: Record<string, (props: { size: number; color: string }) => React.ReactNode> = {
  nearby: ({ size, color }) => <MapPinIcon size={size} color={color} />,
  streak: ({ size, color }) => <FlameIcon size={size} color={color} />,
  'my-deals': ({ size, color }) => <TagIcon size={size} color={color} />,
  profile: ({ size, color }) => <UserIcon size={size} color={color} />,
};

const TAB_LABEL_KEYS: Record<string, string> = {
  nearby: 'consumer.nav.nearby',
  streak: 'consumer.nav.streak',
  'my-deals': 'consumer.nav.myDeals',
  profile: 'consumer.nav.profile',
};

const TAB_LABEL_FALLBACKS: Record<string, string> = {
  nearby: 'Nearby',
  streak: 'Streak',
  'my-deals': 'My Deals',
  profile: 'Profile',
};

export default function ConsumerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();

  const sortedRoutes = TAB_ORDER.map((name) =>
    state.routes.find((r) => r.name === name),
  ).filter(Boolean) as typeof state.routes;

  return (
    <View style={{ backgroundColor: '#0c0c0f', borderTopWidth: 1, borderTopColor: '#2a2a30' }}>
      <SafeAreaView edges={['bottom']}>
        <View className="flex-row items-end h-[56px] px-2 pt-4">
          {sortedRoutes.map((route) => {
            const isFocused = state.routes[state.index].name === route.name;
            const label = t(TAB_LABEL_KEYS[route.name], { defaultValue: TAB_LABEL_FALLBACKS[route.name] });
            const iconColor = isFocused ? '#c8e000' : '#8a8a8f';
            const renderIcon = TAB_ICONS[route.name];

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

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                className="flex-1 items-center justify-end pb-1"
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={label}
              >
                <View className="items-center justify-center w-6 h-6 mb-1">
                  {renderIcon ? renderIcon({ size: 22, color: iconColor }) : null}
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    color: isFocused ? '#c8e000' : '#8a8a8f',
                    fontFamily: 'GoogleSans-Medium',
                  }}
                >
                  {label}
                </Text>
                {isFocused && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: '#c8e000',
                      marginTop: 2,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}
