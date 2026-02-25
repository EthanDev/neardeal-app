import React from 'react';
import { Pressable, View } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}

export function Card({ children, className = '', onPress }: CardProps) {
  const baseClassName = [
    'bg-[#1a1a1f] rounded-lg border border-[#2a2a30] p-4',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={baseClassName}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={baseClassName}>{children}</View>;
}
