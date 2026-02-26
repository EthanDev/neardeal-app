import React from 'react';
import { Text, View } from 'react-native';

type BadgeVariant = 'accent' | 'success' | 'error' | 'warning' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  accent: {
    container: 'bg-accent/20',
    text: 'text-accent',
  },
  success: {
    container: 'bg-success/10',
    text: 'text-success',
  },
  error: {
    container: 'bg-error/10',
    text: 'text-error',
  },
  warning: {
    container: 'bg-warning/10',
    text: 'text-warning',
  },
  neutral: {
    container: 'bg-border',
    text: 'text-text-secondary',
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
