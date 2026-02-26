import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';

const Feather = require('@expo/vector-icons/Feather').default;

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export default function Header({ title, showBack = false, rightAction }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      className="bg-bg border-b border-border"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center justify-between px-4 h-11">
        {/* Left: back button or spacer */}
        <View className="w-20 items-start">
          {showBack ? (
            <Pressable
              onPress={() => { if (router.canGoBack()) router.back(); }}
              className="flex-row items-center gap-1 p-2 -ml-2"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Feather name="chevron-left" size={20} color="#c8e000" />
              <Text className="text-accent text-sm font-semibold">{t('common.back', 'Back')}</Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        {/* Center: title */}
        <Text
          className="text-text-primary font-heading text-lg flex-1 text-center"
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Right: optional action or spacer */}
        <View className="w-10 items-end">
          {rightAction ?? <View />}
        </View>
      </View>
    </View>
  );
}
