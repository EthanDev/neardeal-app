import React from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}

export function Card({ children, className = '', onPress }: CardProps) {
  const baseClassName = [
    'bg-surface rounded-2xl border border-border p-4',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        className={baseClassName}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={baseClassName}>{children}</View>;
}
