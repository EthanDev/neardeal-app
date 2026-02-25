import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  Text,
  TextInput,
  View,
} from 'react-native';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
  multiline = false,
  numberOfLines,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? 'border-[#ef4444]'
    : focused
    ? 'border-[#c8e000]'
    : 'border-[#2a2a30]';

  return (
    <View className="w-full">
      {label ? (
        <Text className="text-[#8a8a8f] text-sm mb-1.5 font-medium">{label}</Text>
      ) : null}

      <View
        className={[
          'flex-row items-center bg-[#1a1a1f] rounded-lg border px-3',
          borderColor,
          multiline ? 'items-start py-3' : 'h-12',
        ].join(' ')}
      >
        {leftIcon ? (
          <View className="mr-2">{leftIcon}</View>
        ) : null}

        <TextInput
          className="flex-1 text-white text-base"
          placeholder={placeholder}
          placeholderTextColor="#8a8a8f"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ color: '#ffffff' }}
        />

        {rightIcon ? (
          <View className="ml-2">{rightIcon}</View>
        ) : null}
      </View>

      {error ? (
        <Text className="text-[#ef4444] text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
