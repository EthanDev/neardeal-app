import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect, Path, Line, Polyline } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- SVG Illustrations ---

function DealsFindYouIllustration() {
  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {/* Radiating circles */}
      <Circle cx={100} cy={100} r={80} stroke="#e5e5e5" strokeWidth={1.5} fill="none" />
      <Circle cx={100} cy={100} r={58} stroke="#e5e5e5" strokeWidth={1.5} fill="none" />
      <Circle cx={100} cy={100} r={36} stroke="#c8e000" strokeWidth={2} fill="none" opacity={0.5} />
      {/* Center pin */}
      <Circle cx={100} cy={90} r={14} fill="#c8e000" />
      <Circle cx={100} cy={90} r={6} fill="#111111" />
      {/* Pin point */}
      <Path d="M100 104 L94 90 Q100 108 106 90 Z" fill="#c8e000" />
      {/* Small dots representing nearby deals */}
      <Circle cx={140} cy={65} r={4} fill="#111111" />
      <Circle cx={60} cy={130} r={4} fill="#111111" />
      <Circle cx={150} cy={120} r={4} fill="#111111" />
    </Svg>
  );
}

function ClaimInSecondsIllustration() {
  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {/* QR code outline */}
      <Rect x={50} y={50} width={100} height={100} rx={12} stroke="#111111" strokeWidth={2.5} fill="none" />
      {/* QR code inner patterns */}
      <Rect x={62} y={62} width={24} height={24} rx={4} stroke="#e5e5e5" strokeWidth={2} fill="none" />
      <Rect x={114} y={62} width={24} height={24} rx={4} stroke="#e5e5e5" strokeWidth={2} fill="none" />
      <Rect x={62} y={114} width={24} height={24} rx={4} stroke="#e5e5e5" strokeWidth={2} fill="none" />
      {/* Small squares */}
      <Rect x={68} y={68} width={12} height={12} rx={2} fill="#e5e5e5" />
      <Rect x={120} y={68} width={12} height={12} rx={2} fill="#e5e5e5" />
      <Rect x={68} y={120} width={12} height={12} rx={2} fill="#e5e5e5" />
      {/* Center dots */}
      <Rect x={96} y={90} width={8} height={8} fill="#e5e5e5" />
      <Rect x={110} y={110} width={8} height={8} fill="#e5e5e5" />
      {/* Checkmark circle overlay */}
      <Circle cx={138} cy={138} r={22} fill="#c8e000" />
      <Polyline
        points="128,138 135,145 150,130"
        stroke="#111111"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BuildYourStreakIllustration() {
  return (
    <Svg width={200} height={200} viewBox="0 0 200 200">
      {/* Ascending bars */}
      <Rect x={38} y={140} width={20} height={24} rx={4} fill="#e5e5e5" />
      <Rect x={66} y={124} width={20} height={40} rx={4} fill="#e5e5e5" />
      <Rect x={94} y={106} width={20} height={58} rx={4} fill="#c8e000" opacity={0.5} />
      <Rect x={122} y={86} width={20} height={78} rx={4} fill="#c8e000" opacity={0.7} />
      <Rect x={150} y={66} width={20} height={98} rx={4} fill="#c8e000" />
      {/* Flame icon above the tallest bar */}
      <Path
        d="M160 56 Q160 38 150 28 Q152 42 144 48 Q142 36 136 30 Q140 46 134 54 Q128 48 130 38 Q124 48 126 58 Q128 66 134 68 Q130 64 132 58 Q136 64 140 62 Q138 68 142 70 Q148 68 150 62 Q152 68 148 72 Q156 68 160 56 Z"
        fill="#c8e000"
      />
      <Path
        d="M148 60 Q148 50 144 46 Q145 52 140 56 Q142 62 146 62 Q150 62 148 60 Z"
        fill="#111111"
        opacity={0.3}
      />
    </Svg>
  );
}

// --- Page Data ---

const pages = [
  {
    key: 'deals',
    Illustration: DealsFindYouIllustration,
    title: 'Deals find you',
    subtitle:
      'Get notified about discounts at nearby businesses as you walk around the city.',
  },
  {
    key: 'claim',
    Illustration: ClaimInSecondsIllustration,
    title: 'Claim in seconds',
    subtitle:
      'See a deal you like? Claim it instantly and show the QR code to redeem in-store.',
  },
  {
    key: 'streak',
    Illustration: BuildYourStreakIllustration,
    title: 'Build your streak',
    subtitle:
      'Claim deals daily to build your streak and unlock exclusive rewards.',
  },
];

// --- Main Component ---

export default function Walkthrough() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < pages.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      router.push('/(onboarding)/categories');
    }
  };

  const handleSkip = () => {
    router.push('/(onboarding)/categories');
  };

  const isLastPage = currentIndex === pages.length - 1;

  const renderItem = ({ item }: { item: (typeof pages)[number] }) => {
    const { Illustration } = item;
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        {/* Illustration area — top half */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Illustration />
        </View>

        {/* Text area */}
        <View
          style={{
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingBottom: 24,
          }}
        >
          <Text
            style={{
              fontFamily: 'GoogleSans-Bold',
              fontSize: 26,
              color: '#111111',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontFamily: 'GoogleSans-Regular',
              fontSize: 14,
              color: '#888888',
              textAlign: 'center',
              lineHeight: 20,
              maxWidth: 280,
            }}
          >
            {item.subtitle}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Scrollable pages */}
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={pages}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />
      </View>

      {/* Bottom section */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        {/* Skip link */}
        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.6}
          style={{ alignSelf: 'flex-end', marginBottom: 16 }}
        >
          <Text
            style={{
              fontFamily: 'GoogleSans-Regular',
              fontSize: 14,
              color: '#888888',
            }}
          >
            Skip
          </Text>
        </TouchableOpacity>

        {/* Dot indicators */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            gap: 6,
          }}
        >
          {pages.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentIndex ? 8 : 6,
                height: i === currentIndex ? 8 : 6,
                borderRadius: i === currentIndex ? 4 : 3,
                backgroundColor: i === currentIndex ? '#111111' : '#dddddd',
              }}
            />
          ))}
        </View>

        {/* Action button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={{
            backgroundColor: isLastPage ? '#c8e000' : '#111111',
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'GoogleSans-Bold',
              fontSize: 17,
              color: isLastPage ? '#111111' : '#ffffff',
            }}
          >
            {isLastPage ? 'Get started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
