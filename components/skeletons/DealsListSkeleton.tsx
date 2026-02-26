import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

function DealCardSkeleton() {
  return (
    <View
      className="mx-4 mb-3 p-4 rounded-xl"
      style={{ backgroundColor: '#1a1a1f' }}
    >
      {/* Title + badge row */}
      <View className="flex-row items-start justify-between mb-3">
        <SkeletonText width="60%" height={16} />
        <Skeleton width={56} height={22} borderRadius={4} />
      </View>

      {/* Category badge */}
      <Skeleton width={72} height={22} borderRadius={4} style={{ marginBottom: 12 }} />

      {/* Progress bar */}
      <Skeleton width="100%" height={6} borderRadius={3} style={{ marginBottom: 8 }} />

      {/* Bottom row */}
      <View className="flex-row items-center justify-between">
        <SkeletonText width={80} height={12} />
        <SkeletonText width={60} height={12} />
      </View>
    </View>
  );
}

export function DealsListSkeleton() {
  return (
    <View className="pt-4">
      {[1, 2, 3, 4].map((i) => (
        <DealCardSkeleton key={i} />
      ))}
    </View>
  );
}
