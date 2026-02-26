import React from 'react';
import { Pressable, Text, View } from 'react-native';

const Feather = require('@expo/vector-icons/Feather').default;

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-6">
        <Feather name={icon} size={48} color="#8a8a8f" />
      </View>

      <Text className="text-white text-lg font-semibold text-center mb-2">{title}</Text>

      {subtitle ? (
        <Text className="text-text-secondary text-sm text-center leading-5 max-w-[240px]">
          {subtitle}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="mt-6 px-6 py-3 bg-accent rounded-lg"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Text className="text-bg font-semibold text-sm">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
