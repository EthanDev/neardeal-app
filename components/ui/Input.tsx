import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  NativeSyntheticEvent,
  Text,
  TextInput,
  TextInputFocusEventData,
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
  onFocus?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onBlur?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  autoFocus?: boolean;
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
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  autoFocus = false,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? '#ef4444'
    : focused
    ? '#c8e000'
    : '#2a2a30';

  const containerDynamicStyle = {
    borderColor,
    ...(multiline ? {} : { height: 48 }),
  };

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setFocused(true);
    onFocusProp?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setFocused(false);
    onBlurProp?.(e);
  };

  return (
    <View className="w-full">
      {label ? (
        <Text className="text-text-secondary text-sm mb-1.5 font-medium">{label}</Text>
      ) : null}

      <View
        className={[
          'flex-row items-center bg-surface rounded-lg border px-3',
          multiline ? 'items-start py-3' : '',
        ].join(' ')}
        style={containerDynamicStyle}
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
          autoFocus={autoFocus}
          textContentType="none"
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={multiline ? { color: '#ffffff' } : { color: '#ffffff', height: 48, paddingVertical: 0 }}
        />

        {rightIcon ? (
          <View className="ml-2">{rightIcon}</View>
        ) : null}
      </View>

      {error ? (
        <Text className="text-error text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
