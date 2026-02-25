import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  Dimensions,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSearchDeals } from '../../hooks/useSearchDeals';
import { addRecentSearch } from './SearchIdleContent';
import SearchIdleContent from './SearchIdleContent';
import SearchResultItem from './SearchResultItem';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SearchOverlay({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { results, isSearching } = useSearchDeals(query);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        inputRef.current?.focus();
      });
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setQuery('');
    }
  }, [visible]);

  const handleClose = () => {
    inputRef.current?.blur();
    onClose();
  };

  const handleSelectDeal = (id: string) => {
    if (query.trim()) addRecentSearch(query.trim());
    handleClose();
    router.push({ pathname: '/(tabs)/nearby/[id]', params: { id } });
  };

  const handleSelectQuery = (q: string) => {
    setQuery(q);
    addRecentSearch(q);
  };

  const hasQuery = query.trim().length > 0;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0c0c0f',
        transform: [{ translateY }],
      }}
    >
      <SafeAreaView edges={['top']} className="flex-1">
        {/* Search Header */}
        <View className="flex-row items-center bg-[#0c0c0f] px-3 py-2 border-b border-[#2a2a30]">
          <Pressable onPress={handleClose} className="p-2 mr-1">
            <Text className="text-[18px] text-[#fff]">←</Text>
          </Pressable>
          <View className="flex-1 flex-row items-center bg-[#1a1a1f] rounded-full px-3" style={{ height: 38 }}>
            <Text className="text-[14px] mr-2">🔍</Text>
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={t('consumer.search.placeholder', { defaultValue: 'Search deals...' })}
              placeholderTextColor="#8a8a8f"
              className="flex-1 text-[14px] text-[#fff]"
              returnKeyType="search"
              autoCorrect={false}
              onSubmitEditing={() => {
                if (query.trim()) addRecentSearch(query.trim());
              }}
            />
            {hasQuery && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Text className="text-[16px] text-[#666]">✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {!hasQuery ? (
            <SearchIdleContent onSelectQuery={handleSelectQuery} />
          ) : isSearching ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#8fa200" />
            </View>
          ) : results.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-[32px] mb-3">🔍</Text>
              <Text className="text-[15px] text-[#8a8a8f] text-center">
                {t('consumer.search.noResults', { defaultValue: 'No deals found. Try a different search.' })}
              </Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 12 }}
              renderItem={({ item }) => (
                <SearchResultItem deal={item} onPress={() => handleSelectDeal(item.id)} />
              )}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}
