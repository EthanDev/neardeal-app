import React from 'react';
import { Text, View } from 'react-native';

type TrendDirection = 'up' | 'down' | 'neutral';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: TrendDirection;
}

function TrendIndicator({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') {
    return (
      <View className="flex-row items-center">
        <Text className="text-[#22c55e] text-xs font-medium">+</Text>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderBottomWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#22c55e',
            marginLeft: 2,
          }}
        />
      </View>
    );
  }

  if (direction === 'down') {
    return (
      <View className="flex-row items-center">
        <Text className="text-[#ef4444] text-xs font-medium">-</Text>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderTopWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: '#ef4444',
            marginLeft: 2,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: 10,
        height: 2,
        backgroundColor: '#8a8a8f',
        borderRadius: 1,
      }}
    />
  );
}

export function KpiCard({ title, value, subtitle, trend }: KpiCardProps) {
  return (
    <View className="bg-[#1a1a1f] rounded-lg border border-[#2a2a30] p-4 flex-1">
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-[#8a8a8f] text-xs font-medium uppercase tracking-wide flex-1 mr-2">
          {title}
        </Text>
        {trend ? <TrendIndicator direction={trend} /> : null}
      </View>

      <Text className="text-white text-2xl font-bold mb-1">{value}</Text>

      {subtitle ? (
        <Text className="text-[#8a8a8f] text-xs">{subtitle}</Text>
      ) : null}
    </View>
  );
}
