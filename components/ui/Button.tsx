import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-[#c8e000]',
    text: 'text-[#0c0c0f] font-semibold',
  },
  secondary: {
    container: 'bg-[#1a1a1f] border border-[#2a2a30]',
    text: 'text-white font-semibold',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-[#c8e000] font-semibold',
  },
  danger: {
    container: 'bg-[#ef4444]',
    text: 'text-white font-semibold',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'px-3 py-2 rounded-md',
    text: 'text-sm',
  },
  md: {
    container: 'px-5 py-3 rounded-lg',
    text: 'text-base',
  },
  lg: {
    container: 'px-6 py-4 rounded-xl',
    text: 'text-lg',
  },
};

export function Button({
  variant = 'primary',
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  size = 'md',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { container: variantContainer, text: variantText } = variantStyles[variant];
  const { container: sizeContainer, text: sizeText } = sizeStyles[size];

  const activityIndicatorColor =
    variant === 'primary' ? '#0c0c0f' : variant === 'ghost' ? '#c8e000' : '#ffffff';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
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
    </Pressable>
  );
}
