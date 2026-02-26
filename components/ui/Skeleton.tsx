import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  className,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={className}
      style={[
        {
          backgroundColor: '#1a1a1f',
          borderRadius,
          width,
          height,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonText({
  width = '100%',
  height = 14,
  ...props
}: SkeletonProps) {
  return <Skeleton width={width} height={height} borderRadius={4} {...props} />;
}

export function SkeletonCircle({
  size = 48,
  ...props
}: SkeletonProps & { size?: number }) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      {...props}
    />
  );
}

export function SkeletonCard({
  height = 80,
  ...props
}: SkeletonProps) {
  return <Skeleton width="100%" height={height} borderRadius={12} {...props} />;
}
