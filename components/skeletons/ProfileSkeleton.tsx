import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText } from '@/components/ui/Skeleton';

export function ProfileSkeleton() {
  return (
    <View>
      {/* Avatar + name */}
      <View className="items-center py-8">
        <SkeletonCircle size={80} style={{ marginBottom: 12 }} />
        <SkeletonText width={160} height={18} />
      </View>

      {/* Section header */}
      <SkeletonText width={80} height={10} style={{ marginBottom: 8, marginLeft: 16 }} />

      {/* Menu items */}
      {[1, 2].map((i) => (
        <Skeleton
          key={`biz-${i}`}
          width="100%"
          height={52}
          borderRadius={0}
          style={{ marginBottom: 1 }}
        />
      ))}

      <View style={{ height: 24 }} />

      {/* Section header */}
      <SkeletonText width={80} height={10} style={{ marginBottom: 8, marginLeft: 16 }} />

      {/* Menu items */}
      {[1, 2].map((i) => (
        <Skeleton
          key={`acc-${i}`}
          width="100%"
          height={52}
          borderRadius={0}
          style={{ marginBottom: 1 }}
        />
      ))}

      <View style={{ height: 40 }} />

      {/* Logout */}
      <Skeleton width="100%" height={52} borderRadius={0} />
    </View>
  );
}
