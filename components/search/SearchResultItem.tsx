import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Deal } from '../../hooks/useSearchDeals';
import { getCategoryIcon } from '@/components/icons/CategoryIcons';

type Props = {
  deal: Deal;
  onPress: () => void;
};

export default function SearchResultItem({ deal, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-[#1a1a1f] rounded-xl mb-3 mx-4 flex-row overflow-hidden"
    >
      <View style={{ backgroundColor: deal.color, width: 5 }} />
      <View className="flex-1 p-4">
        <View className="flex-row items-center mb-1">
          {getCategoryIcon(deal.categoryKey || 'food', 13, '#8a8a8f')}
          <Text className="text-[11px] font-semibold text-[#8a8a8f] ml-1">
            {deal.category}
          </Text>
        </View>
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-[15px] font-bold text-[#fff]">{deal.business}</Text>
          <View className="bg-[#c8e000] px-2 py-0.5 rounded-md">
            <Text className="text-[12px] font-bold text-[#111]">-{deal.discount}%</Text>
          </View>
        </View>
        <Text className="text-[13px] text-[#8a8a8f] mb-2">{deal.description}</Text>
        <View className="flex-row items-center gap-3">
          <Text className="text-[12px] text-[#666]">{deal.distance}</Text>
          <Text className={`text-[12px] font-medium ${deal.urgent ? 'text-red-500' : 'text-[#666]'}`}>
            {deal.timeLeft}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
