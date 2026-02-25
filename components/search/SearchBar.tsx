import { Pressable, Text, View } from 'react-native';
import { SearchIcon } from '@/components/icons/CategoryIcons';

type Props = {
  onOpen: () => void;
};

export default function SearchBar({ onOpen }: Props) {
  return (
    <Pressable
      onPress={onOpen}
      className="flex-row items-center bg-[#1a1a1f] border border-[#2a2a30] rounded-full px-3 mx-4"
      style={{ height: 36, marginTop: 10, marginBottom: 6 }}
    >
      <View style={{ marginRight: 8 }}>
        <SearchIcon size={16} color="#8a8a8f" />
      </View>
      <Text className="text-[13px] text-[#8a8a8f] flex-1">
        Search...
      </Text>
    </Pressable>
  );
}
