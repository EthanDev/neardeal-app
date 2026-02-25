import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export default function Header({ title, showBack = false, rightAction }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-bg border-b border-border"
      style={{ paddingTop: insets.top - 4 }}
    >
      <View className="flex-row items-center justify-between px-4 h-11">
        {/* Left: back button or spacer */}
        <View className="w-10 items-start">
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              className="p-2 -ml-2"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text className="text-text-primary text-xl font-heading">{'<'}</Text>
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
