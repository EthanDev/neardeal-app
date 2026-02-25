import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className="w-16 h-16 rounded-2xl bg-[#1a1a1f] border border-[#2a2a30] items-center justify-center mb-6">
        <View className="w-8 h-8 rounded-lg border-2 border-[#2a2a30]" />
      </View>

      <Text className="text-white text-lg font-semibold text-center mb-2">{title}</Text>
      <Text className="text-[#8a8a8f] text-sm text-center leading-5">{message}</Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="mt-6 px-6 py-3 bg-[#c8e000] rounded-lg"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Text className="text-[#0c0c0f] font-semibold text-sm">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
