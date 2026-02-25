import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  variant: ToastVariant;
  duration: number;
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  variant: 'info',
  duration: 3000,
  show: (message, variant = 'info', duration = 3000) =>
    set({ visible: true, message, variant, duration }),
  hide: () => set({ visible: false }),
}));

const variantStyles: Record<ToastVariant, { container: string; text: string; indicator: string }> = {
  success: {
    container: 'bg-[#1a1a1f] border border-[#22c55e]',
    text: 'text-white',
    indicator: 'bg-[#22c55e]',
  },
  error: {
    container: 'bg-[#1a1a1f] border border-[#ef4444]',
    text: 'text-white',
    indicator: 'bg-[#ef4444]',
  },
  warning: {
    container: 'bg-[#1a1a1f] border border-[#f59e0b]',
    text: 'text-white',
    indicator: 'bg-[#f59e0b]',
  },
  info: {
    container: 'bg-[#1a1a1f] border border-[#2a2a30]',
    text: 'text-white',
    indicator: 'bg-[#c8e000]',
  },
};

const variantLabels: Record<ToastVariant, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

interface ToastProps {
  message?: string;
  variant?: ToastVariant;
  duration?: number;
  visible?: boolean;
  onHide?: () => void;
}

function ToastInner({
  message,
  variant = 'info',
  duration = 3000,
  visible,
  onHide,
}: ToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const hide = onHide ?? (() => {});

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      translateY.value = withDelay(
        duration,
        withTiming(-100, { duration: 300 }, (finished) => {
          if (finished) runOnJS(hide)();
        })
      );
      opacity.value = withDelay(duration, withTiming(0, { duration: 300 }));
    } else {
      translateY.value = withTiming(-100, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const styles = variantStyles[variant];

  return (
    <Animated.View
      style={[animatedStyle, { position: 'absolute', top: 56, left: 16, right: 16, zIndex: 999 }]}
    >
      <View className={['rounded-xl px-4 py-3 flex-row items-center shadow-lg', styles.container].join(' ')}>
        <View className={['w-2 h-2 rounded-full mr-3', styles.indicator].join(' ')} />
        <View className="flex-1">
          <Text className={['text-xs font-semibold mb-0.5 uppercase tracking-wide', styles.text].join(' ')}>
            {variantLabels[variant]}
          </Text>
          <Text className="text-white text-sm">{message}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function Toast(props: ToastProps) {
  const store = useToastStore();

  if (props.visible !== undefined) {
    return <ToastInner {...props} />;
  }

  return (
    <ToastInner
      message={store.message}
      variant={store.variant}
      duration={store.duration}
      visible={store.visible}
      onHide={store.hide}
    />
  );
}

export const toast = {
  show: (message: string, variant?: ToastVariant, duration?: number) =>
    useToastStore.getState().show(message, variant, duration),
  success: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'success', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'error', duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'warning', duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'info', duration),
};
