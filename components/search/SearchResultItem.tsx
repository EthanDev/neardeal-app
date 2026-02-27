import React from 'react';
import { Pressable, Text, View, Image } from 'react-native';
import { Deal } from '../../hooks/useSearchDeals';
import { getCategoryIcon } from '@/components/icons/CategoryIcons';
import { getBusinessLogo } from '@/lib/businessLogos';

type Props = {
  deal: Deal;
  onPress: () => void;
};

export default function SearchResultItem({ deal, onPress }: Props) {
  const logo = getBusinessLogo((deal as any).businessLogo);

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface rounded-xl mb-3 mx-4 flex-row overflow-hidden"
    >
      <View className="flex-1 p-4 flex-row">
        {/* Logo */}
        {logo ? (
          <Image source={logo} style={{ width: 44, height: 44, borderRadius: 11 }} className="mr-3" />
        ) : (
          <View className="w-[44px] h-[44px] rounded-xl bg-[#2a2a30] items-center justify-center mr-3">
            {getCategoryIcon((deal as any).categoryKey || 'food', 20, '#8a8a8f')}
          </View>
        )}

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text className="text-[15px] font-bold text-text-primary flex-1 mr-2">{deal.business}</Text>
            <View className="bg-accent px-2 py-0.5 rounded-md">
              <Text className="text-[12px] font-bold text-bg">-{deal.discount}%</Text>
            </View>
          </View>
          <Text className="text-[13px] text-text-secondary mb-1.5" numberOfLines={2}>{deal.description}</Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-[11px] text-text-secondary">{deal.category}</Text>
            <Text className="text-[11px] text-text-secondary">{deal.distance}</Text>
            <Text className={`text-[11px] font-medium ${deal.urgent ? 'text-red-500' : 'text-text-secondary'}`}>
              {deal.timeLeft}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
