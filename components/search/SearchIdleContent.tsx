import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { getCategoryIcon, SearchIcon } from '@/components/icons/CategoryIcons';

const STORAGE_KEY = 'neardeal_recent_searches';

const AREAS = [
  'Floreasca', 'Dorobanti', 'Herastrau', 'Pipera',
  'Universitate', 'Lipscani', 'Unirii', 'Victoriei',
];

const CATEGORIES = [
  { label: 'Coffee & Drinks', value: 'coffee' },
  { label: 'Grocery', value: 'grocery' },
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Fitness', value: 'fitness' },
  { label: 'Fashion', value: 'fashion' },
  { label: 'Books', value: 'books' },
];

type Props = {
  onSelectQuery: (query: string) => void;
};

export default function SearchIdleContent({ onSelectQuery }: Props) {
  const { t } = useTranslation();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {}
  };

  const removeRecent = async (item: string) => {
    const updated = recentSearches.filter((s) => s !== item);
    setRecentSearches(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View className="px-4 pt-4 pb-2">
          <Text className="text-[14px] font-bold text-[#fff] mb-3">
            {t('consumer.search.recent', { defaultValue: 'Recent searches' })}
          </Text>
          {recentSearches.map((item) => (
            <View key={item} className="flex-row items-center justify-between py-2">
              <Pressable
                onPress={() => onSelectQuery(item)}
                className="flex-row items-center flex-1 mr-3"
              >
                <View className="mr-3">
                  <SearchIcon size={14} color="#8a8a8f" />
                </View>
                <Text className="text-[14px] text-[#fff]">{item}</Text>
              </Pressable>
              <Pressable onPress={() => removeRecent(item)} hitSlop={8}>
                <Text className="text-[16px] text-[#666]">x</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Browse by Area */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-[14px] font-bold text-[#fff] mb-3">
          {t('consumer.search.browseArea', { defaultValue: 'Browse by area' })}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {AREAS.map((area) => (
            <Pressable
              key={area}
              onPress={() => onSelectQuery(area)}
              className="bg-[#1a1a1f] border border-[#2a2a30] rounded-full px-4 py-2"
            >
              <Text className="text-[13px] text-[#fff]">{area}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Popular Categories */}
      <View className="px-4 pt-4 pb-6">
        <Text className="text-[14px] font-bold text-[#fff] mb-3">
          {t('consumer.search.popular', { defaultValue: 'Popular categories' })}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              onPress={() => onSelectQuery(cat.label)}
              className="bg-[#1a1a1f] border border-[#2a2a30] rounded-full px-4 py-2 flex-row items-center"
            >
              <View style={{ marginRight: 5 }}>
                {getCategoryIcon(cat.value, 14, '#8a8a8f')}
              </View>
              <Text className="text-[13px] text-[#fff]">{cat.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

/** Save a search term to recent searches (called externally). */
export async function addRecentSearch(term: string) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let list: string[] = raw ? JSON.parse(raw) : [];
    list = [term, ...list.filter((s) => s !== term)].slice(0, 10);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}
