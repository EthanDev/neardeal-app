import { Pressable, Text, View } from 'react-native';
import { SearchIcon } from '@/components/icons/CategoryIcons';

type Props = {
  onOpen: () => void;
};

export default function SearchBar({ onOpen }: Props) {
  return (
    <Pressable
      onPress={onOpen}
      className="flex-row items-center bg-surface border border-border rounded-full px-3 mx-4"
      style={{ height: 36, marginTop: 10, marginBottom: 6 }}
    >
      <View style={{ marginRight: 8 }}>
        <SearchIcon size={16} color="#8a8a8f" />
      </View>
      <Text className="text-[13px] text-text-secondary flex-1">
        Search...
      </Text>
    </Pressable>
  );
}
