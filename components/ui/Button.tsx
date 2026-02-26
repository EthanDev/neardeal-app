import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-accent',
    text: 'text-bg font-semibold',
  },
  secondary: {
    container: 'bg-surface border border-border',
    text: 'text-white font-semibold',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-accent font-semibold',
  },
  danger: {
    container: 'bg-error',
    text: 'text-white font-semibold',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string; height: number }> = {
  sm: {
    container: 'px-3 rounded-lg',
    text: 'text-sm',
    height: 36,
  },
  md: {
    container: 'px-4 rounded-xl',
    text: 'text-base',
    height: 48,
  },
  lg: {
    container: 'px-6 rounded-xl',
    text: 'text-lg',
    height: 56,
  },
};

export function Button({
  variant = 'primary',
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  rightIcon,
  fullWidth = false,
  size = 'md',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { container: variantContainer, text: variantText } = variantStyles[variant];
  const { container: sizeContainer, text: sizeText, height: sizeHeight } = sizeStyles[size];

  const activityIndicatorColor =
    variant === 'primary' ? '#0c0c0f' : variant === 'ghost' ? '#c8e000' : '#ffffff';

  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          const style = variant === 'danger'
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Light;
          Haptics.impactAsync(style);
          onPress();
        }
      }}
      disabled={isDisabled}
      style={{ height: sizeHeight }}
      className={[
        'flex-row items-center justify-center',
        variantContainer,
        sizeContainer,
        fullWidth ? 'w-full' : 'self-start',
        isDisabled ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={activityIndicatorColor}
          className="mr-2"
        />
      ) : icon ? (
        <View className="mr-2">{icon}</View>
      ) : null}
      <Text className={[variantText, sizeText].join(' ')}>{title}</Text>
      {rightIcon ? (
        <View className="ml-2">{rightIcon}</View>
      ) : null}
    </Pressable>
  );
}
