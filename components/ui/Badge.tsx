import React from 'react';
import { Text, View } from 'react-native';

type BadgeVariant = 'accent' | 'success' | 'error' | 'warning' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  accent: {
    container: 'bg-[#c8e000]/20',
    text: 'text-[#c8e000]',
  },
  success: {
    container: 'bg-[#22c55e]/20',
    text: 'text-[#22c55e]',
  },
  error: {
    container: 'bg-[#ef4444]/20',
    text: 'text-[#ef4444]',
  },
  warning: {
    container: 'bg-[#f59e0b]/20',
    text: 'text-[#f59e0b]',
  },
  neutral: {
    container: 'bg-[#2a2a30]',
    text: 'text-[#8a8a8f]',
  },
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const { container, text } = variantStyles[variant];

  return (
    <View className={['rounded-full px-2.5 py-0.5 self-start', container].join(' ')}>
      <Text className={['text-xs font-medium', text].join(' ')}>{label}</Text>
    </View>
  );
}
