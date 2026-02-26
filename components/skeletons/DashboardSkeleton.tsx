import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/Skeleton';

export function DashboardSkeleton() {
  return (
    <View className="px-4 pt-5">
      {/* KPI Grid - 2x2 */}
      <View className="flex-row gap-3 mb-3">
        <SkeletonCard height={80} style={{ flex: 1 }} />
        <SkeletonCard height={80} style={{ flex: 1 }} />
      </View>
      <View className="flex-row gap-3 mb-6">
        <SkeletonCard height={80} style={{ flex: 1 }} />
        <SkeletonCard height={80} style={{ flex: 1 }} />
      </View>

      {/* Quick action buttons */}
      <View className="flex-row gap-3 mb-8">
        <Skeleton height={48} borderRadius={10} style={{ flex: 1 }} />
        <Skeleton height={48} borderRadius={10} style={{ flex: 1 }} />
      </View>

      {/* Section title */}
      <SkeletonText width={140} height={16} style={{ marginBottom: 16 }} />

      {/* Activity cards */}
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} height={64} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}
