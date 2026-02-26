import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Animated,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { api } from '@/lib/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/store';
import { useProfileStore } from '@/lib/profile-store';
import {
  getCategoryIcon,
  FlameIcon,
  BellIcon,
  BoltIcon,
  ClockIcon,
  BarChartIcon,
  BellOffIcon,
  MapPinIcon,
  UserIcon,
  LockIcon,
  HelpCircleIcon,
  MessageIcon,
  StarIcon,
} from '@/components/icons/CategoryIcons';

/* ───────── i18n helper with fallbacks ───────── */
const FALLBACKS: Record<string, string> = {
  'consumer.profile.edit': 'Edit',
  'consumer.profile.claimed': 'CLAIMED',
  'consumer.profile.ronSaved': 'RON SAVED',
  'consumer.profile.dayStreak': 'DAY STREAK',
  'consumer.profile.notificationCategories': 'NOTIFICATION CATEGORIES',
  'consumer.profile.categories.food': 'Food',
  'consumer.profile.categories.grocery': 'Grocery',
  'consumer.profile.categories.fitness': 'Fitness',
  'consumer.profile.categories.fashion': 'Fashion',
  'consumer.profile.categories.beauty': 'Beauty',
  'consumer.profile.categories.entertainment': 'Entertainment',
  'consumer.profile.categories.pharmacy': 'Pharmacy',
  'consumer.profile.dealAlerts': 'Deal alerts',
  'consumer.profile.flashAlerts': 'Flash deal alerts',
  'consumer.profile.lastChanceAlerts': 'Last chance alerts',
  'consumer.profile.monthlySummary': 'Monthly savings summary',
  'consumer.profile.quietHours': 'Quiet hours',
  'consumer.profile.maxRadius': 'Max radius',
  'consumer.profile.personalInfo': 'Personal info',
  'consumer.profile.homeDistrict': 'Home district',
  'consumer.profile.privacyData': 'Privacy & data',
  'consumer.profile.save': 'Save',
  'consumer.profile.inviteFriends': 'INVITE FRIENDS',
  'consumer.profile.referralTitle': 'Both of you win',
  'consumer.profile.referralSubtitle':
    'Share your code and both get early flash deal access',
  'consumer.profile.copy': 'Copy',
  'consumer.profile.copied': 'Copied!',
  'consumer.profile.helpFaq': 'Help & FAQ',
  'consumer.profile.sendFeedback': 'Send feedback',
  'consumer.profile.rateApp': 'Rate NearDeal',
  'consumer.profile.signOut': 'Sign out',
};

/* ───────── custom animated toggle ───────── */
function Toggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: value ? 20 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [value]);

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      className={`w-[44px] h-[26px] rounded-full justify-center px-[3px] ${
        value ? 'bg-[#c8e000]' : 'bg-[#2a2a30]'
      }`}
    >
      <Animated.View
        style={[
          {
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#fff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 3,
            elevation: 3,
            transform: [{ translateX }],
          },
        ]}
      />
    </Pressable>
  );
}

/* ───────── row helpers ───────── */
function SettingRow({
  icon,
  label,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  right: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center py-3">
      <View className="w-9 h-9 rounded-lg bg-[#222228] items-center justify-center mr-3">
        {icon}
      </View>
      <Text className="flex-1 text-[15px] text-white">{label}</Text>
      {right}
    </View>
  );
}

function Chevron() {
  return <Text className="text-[18px] text-[#666] ml-1">{'\u203A'}</Text>;
}

/* ───────── category chips ───────── */
const CATEGORIES = [
  { key: 'food' },
  { key: 'grocery' },
  { key: 'fitness' },
  { key: 'fashion' },
  { key: 'beauty' },
  { key: 'entertainment' },
  { key: 'pharmacy' },
] as const;

/* ───────── main screen ───────── */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const userEmail = useAuthStore((s) => s.user?.email) ?? '';
  const profileStore = useProfileStore();

  const [stats, setStats] = useState({ claimed: 0, ronSaved: 0, streak: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Hydrate profile store on mount
  useEffect(() => {
    if (!profileStore.hydrated) profileStore.hydrate();

    (async () => {
      try {
        const [savings, streak] = await Promise.all([
          api.get<{ totalClaims: number; allTimeSavings: number }>('/api/consumer/savings'),
          api.get<{ currentStreak: number }>('/api/consumer/streak'),
        ]);
        setStats({
          claimed: savings.totalClaims || 0,
          ronSaved: Math.round(savings.allTimeSavings || 0),
          streak: streak.currentStreak || 0,
        });
      } catch {
        // Keep defaults
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  const T = (key: string) => {
    const result = t(key);
    return result === key ? FALLBACKS[key] ?? key : result;
  };

  const selectedCategories = profileStore.selectedCategories;

  const notificationPreferences = useProfileStore((s) => s.notificationPreferences);
  const setNotificationPreference = useProfileStore((s) => s.setNotificationPreference);

  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [name, setName] = useState('');
  const district = useProfileStore((s) => s.district);
  const setDistrict = useProfileStore((s) => s.setDistrict);
  const [quietHoursModal, setQuietHoursModal] = useState(false);
  const quietStartHour = useProfileStore((s) => s.quietStartHour);
  const quietEndHour = useProfileStore((s) => s.quietEndHour);
  const setQuietHours = useProfileStore((s) => s.setQuietHours);
  const quietStart = new Date(2024, 0, 1, quietStartHour, 0);
  const quietEnd = new Date(2024, 0, 1, quietEndHour, 0);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [radiusPickerOpen, setRadiusPickerOpen] = useState(false);
  const maxRadius = useProfileStore((s) => s.maxRadius);
  const setMaxRadius = useProfileStore((s) => s.setMaxRadius);

  // Sync local name from store once hydrated
  useEffect(() => {
    if (profileStore.hydrated && profileStore.name) {
      setName(profileStore.name);
    }
  }, [profileStore.hydrated, profileStore.name]);

  // District is now read directly from the store (no local sync needed)

  const avatarUri = profileStore.avatarUri;

  const toggleCategory = (key: string) => {
    const updated = selectedCategories.includes(key)
      ? selectedCategories.filter((k) => k !== key)
      : [...selectedCategories, key];
    profileStore.setSelectedCategories(updated);
  };

  const setToggle = (key: keyof typeof notificationPreferences) =>
    setNotificationPreference(key, !notificationPreferences[key]);

  const handleTakePhoto = async () => {
    setAvatarPickerOpen(false);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      profileStore.setAvatarUri(result.assets[0].uri);
    }
  };

  const handleChooseFromGallery = async () => {
    setAvatarPickerOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      profileStore.setAvatarUri(result.assets[0].uri);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c0f]" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View className="bg-[#0c0c0f] px-5 pt-5 pb-4 border-b border-[#2a2a30]">
          {/* user row */}
          <View className="flex-row items-center mb-4">
            <Pressable onPress={() => setAvatarPickerOpen(true)} className="mr-3">
              <View className="w-[68px] h-[68px] bg-[#c8e000] rounded-2xl items-center justify-center">
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 68, height: 68, borderRadius: 16 }} />
                ) : (
                  <Text className="text-[28px] font-bold text-[#111]">{name.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              {/* Camera icon overlay */}
              <View style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: '#222228',
                borderWidth: 1.5,
                borderColor: '#2a2a30',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#8a8a8f',
                }} />
              </View>
            </Pressable>
            <View className="flex-1">
              {editing ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="text-[22px] font-bold text-white border-b border-[#c8e000] pb-1"
                  autoFocus
                  textContentType="none"
                  placeholderTextColor="#666"
                />
              ) : (
                <Text className="text-[22px] font-bold text-white">
                  {name}
                </Text>
              )}
              <Text className="text-[13px] text-[#8a8a8f] mt-0.5">
                {userEmail || 'No email'}
              </Text>
            </View>
            {editing ? (
              <TouchableOpacity
                onPress={() => { setEditing(false); profileStore.setName(name); }}
                className="px-4 py-2 rounded-xl bg-[#c8e000]"
              >
                <Text className="text-[13px] font-semibold text-[#111]">
                  {T('consumer.profile.save')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setEditing(true)}
                className="px-4 py-2 rounded-xl bg-[#222228]"
              >
                <Text className="text-[13px] font-semibold text-[#8a8a8f]">
                  {T('consumer.profile.edit')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* stats */}
          <View className="flex-row bg-[#222228] rounded-xl p-3">
            <View className="flex-1 items-center">
              <Text className="text-[18px] font-bold text-white">{statsLoading ? '–' : stats.claimed}</Text>
              <Text className="text-[11px] text-[#8a8a8f] mt-0.5 tracking-wide uppercase">
                {T('consumer.profile.claimed')}
              </Text>
            </View>
            <View className="flex-1 items-center border-l border-r border-[#2a2a30]">
              <Text className="text-[18px] font-bold text-[#18a056]">{statsLoading ? '–' : stats.ronSaved}</Text>
              <Text className="text-[11px] text-[#8a8a8f] mt-0.5 tracking-wide uppercase">
                {T('consumer.profile.ronSaved')}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <View className="flex-row items-center">
                <Text className="text-[18px] font-bold text-white">{statsLoading ? '–' : stats.streak}</Text>
                <View style={{ marginLeft: 2 }}>
                  <FlameIcon size={16} color="#c8e000" />
                </View>
              </View>
              <Text className="text-[11px] text-[#8a8a8f] mt-0.5 tracking-wide uppercase">
                {T('consumer.profile.dayStreak')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Notification categories ── */}
        <View className="px-5 mt-5">
          <Text className="text-[11px] text-[#666] tracking-widest mb-3 uppercase">
            {T('consumer.profile.notificationCategories')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map(({ key }) => {
              const selected = selectedCategories.includes(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleCategory(key)}
                  className={`flex-row items-center px-3 py-2 rounded-full border ${
                    selected
                      ? 'bg-[#c8e000] border-[#c8e000]'
                      : 'bg-[#1a1a1f] border-[#2a2a30]'
                  }`}
                >
                  <View style={{ marginRight: 4 }}>
                    {getCategoryIcon(key, 14, selected ? '#111' : '#8a8a8f')}
                  </View>
                  <Text
                    className={`text-[13px] font-medium ${
                      selected ? 'text-[#111]' : 'text-[#8a8a8f]'
                    }`}
                  >
                    {T(`consumer.profile.categories.${key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Notification settings ── */}
        <View
          className="mx-5 mt-5 bg-[#1a1a1f] rounded-2xl px-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <SettingRow
            icon={<BellIcon size={20} color="#8a8a8f" />}
            label={T('consumer.profile.dealAlerts')}
            right={
              <Toggle
                value={notificationPreferences.dealAlerts}
                onValueChange={() => setToggle('dealAlerts')}
              />
            }
          />
          <View className="border-b border-[#2a2a30]" />
          <SettingRow
            icon={<BoltIcon size={20} color="#8a8a8f" />}
            label={T('consumer.profile.flashAlerts')}
            right={
              <Toggle
                value={notificationPreferences.flashAlerts}
                onValueChange={() => setToggle('flashAlerts')}
              />
            }
          />
          <View className="border-b border-[#2a2a30]" />
          <SettingRow
            icon={<ClockIcon size={20} color="#8a8a8f" />}
            label={T('consumer.profile.lastChanceAlerts')}
            right={
              <Toggle
                value={notificationPreferences.lastChance}
                onValueChange={() => setToggle('lastChance')}
              />
            }
          />
          <View className="border-b border-[#2a2a30]" />
          <SettingRow
            icon={<BarChartIcon size={20} color="#8a8a8f" />}
            label={T('consumer.profile.monthlySummary')}
            right={
              <Toggle
                value={notificationPreferences.monthlySummary}
                onValueChange={() => setToggle('monthlySummary')}
              />
            }
          />
          <View className="border-b border-[#2a2a30]" />
          <Pressable onPress={() => setQuietHoursModal(true)}>
            <SettingRow
              icon={<BellOffIcon size={20} color="#8a8a8f" />}
              label={T('consumer.profile.quietHours')}
              right={
                <View className="flex-row items-center">
                  <Text className="text-[13px] text-[#8a8a8f]">{`${quietStart.getHours().toString().padStart(2,'0')}:${quietStart.getMinutes().toString().padStart(2,'0')} \u2013 ${quietEnd.getHours().toString().padStart(2,'0')}:${quietEnd.getMinutes().toString().padStart(2,'0')}`}</Text>
                  <Chevron />
                </View>
              }
            />
          </Pressable>
          <View className="border-b border-[#2a2a30]" />
          <Pressable onPress={() => setRadiusPickerOpen(true)}>
            <SettingRow
              icon={<MapPinIcon size={20} color="#8a8a8f" />}
              label={T('consumer.profile.maxRadius')}
              right={
                <View className="flex-row items-center">
                  <Text className="text-[13px] text-[#8a8a8f]">{maxRadius >= 1000 ? `${maxRadius / 1000}km` : `${maxRadius}m`}</Text>
                  <Chevron />
                </View>
              }
            />
          </Pressable>
        </View>

        {/* ── Account settings ── */}
        <View className="mx-5 mt-5 bg-[#1a1a1f] rounded-2xl px-4">
          <SettingRow
            icon={<UserIcon size={20} color="#8a8a8f" />}
            label={T('consumer.profile.personalInfo')}
            right={<Chevron />}
          />
          <View className="border-b border-[#2a2a30]" />
          <SettingRow
            icon={<MapPinIcon size={20} color="#8a8a8f" />}
            label={T('consumer.profile.homeDistrict')}
            right={
              editing ? (
                <TextInput
                  value={district}
                  onChangeText={setDistrict}
                  className="text-[13px] text-white border-b border-[#c8e000] min-w-[80px] text-right pb-1"
                  textContentType="none"
                  placeholderTextColor="#666"
                />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-[13px] text-[#8a8a8f]">{district}</Text>
                  <Chevron />
                </View>
              )
            }
          />
          <View className="border-b border-[#2a2a30]" />
          <SettingRow
            icon={<LockIcon size={20} color="#8a8a8f" />}
            label={T('consumer.profile.privacyData')}
            right={<Chevron />}
          />
        </View>

        {/* ── Referral card ── */}
        <View className="mx-5 mt-5 bg-[#222228] rounded-2xl p-5">
          <Text className="text-[11px] text-[#8a8a8f] tracking-widest mb-1 uppercase">
            {T('consumer.profile.inviteFriends')}
          </Text>
          <Text className="text-[18px] font-bold text-white mb-1">
            {T('consumer.profile.referralTitle')}
          </Text>
          <Text className="text-[13px] text-[#8a8a8f] mb-4">
            {T('consumer.profile.referralSubtitle')}
          </Text>
          <View className="flex-row items-center">
            <View className="flex-1 border border-dashed border-[#444] rounded-xl px-4 py-3 mr-3">
              <Text className="text-[16px] font-bold text-[#c8e000] tracking-wider">
                {profileStore.referralCode || 'NEARDEAL'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCopy}
              className="bg-[#c8e000] rounded-xl px-5 py-3"
            >
              <Text className="text-[14px] font-bold text-[#111]">
                {copied
                  ? T('consumer.profile.copied')
                  : T('consumer.profile.copy')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Support ── */}
        <View className="mx-5 mt-5 bg-[#1a1a1f] rounded-2xl px-4">
          <Pressable onPress={() => setFaqOpen(true)}>
            <SettingRow
              icon={<HelpCircleIcon size={20} color="#8a8a8f" />}
              label={T('consumer.profile.helpFaq')}
              right={<Chevron />}
            />
          </Pressable>
          <View className="border-b border-[#2a2a30]" />
          <SettingRow
            icon={<MessageIcon size={20} color="#8a8a8f" />}
            label={T('consumer.profile.sendFeedback')}
            right={<Chevron />}
          />
          <View className="border-b border-[#2a2a30]" />
          <SettingRow
            icon={<StarIcon size={20} color="#8a8a8f" />}
            label={T('consumer.profile.rateApp')}
            right={<Chevron />}
          />
        </View>

        {/* ── Sign out ── */}
        <View className="mx-5 mt-5 mb-8">
          <TouchableOpacity
            onPress={async () => {
              await useAuthStore.getState().logout();
              router.replace('/(auth)/login');
            }}
            className="bg-[#1a1a1f] border border-[#3a2020] rounded-xl py-4 items-center"
          >
            <Text className="text-[15px] font-semibold text-[#e03030]">
              {T('consumer.profile.signOut')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Help & FAQ Modal */}
      <Modal visible={faqOpen} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-[#0c0c0f]">
          <SafeAreaView edges={['top']} className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#2a2a30]">
              <Text className="text-[20px] font-bold text-white">Help & FAQ</Text>
              <Pressable
                onPress={() => { setFaqOpen(false); setExpandedFaq(null); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-[15px] font-semibold text-[#c8e000]">Done</Text>
              </Pressable>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
              {[
                {
                  section: 'Getting Started',
                  items: [
                    { q: 'How does NearDeal work?', a: 'NearDeal shows you deals from local businesses near your current location. As you walk around, you\'ll get notified about discounts happening nearby. Claim a deal, show the QR code at the counter, and save money.' },
                    { q: 'Do I need to pay for anything?', a: 'NearDeal is completely free for consumers. You\'ll never be charged. Businesses pay to list their deals — you just enjoy the savings.' },
                    { q: 'How do I claim a deal?', a: 'Tap on any deal to see the details, then press "Claim this deal". A QR code will appear — show it to the cashier at the business to redeem your discount.' },
                  ],
                },
                {
                  section: 'Location & Notifications',
                  items: [
                    { q: 'Why does the app need my location?', a: 'We use your location to find deals near you. We never store your location history or share it with anyone. You can disable location access at any time in your phone\'s Settings.' },
                    { q: 'How do I stop getting notifications?', a: 'Go to your Profile > Notifications section and toggle off any alert types you don\'t want. You can also set quiet hours or adjust your max radius.' },
                    { q: 'Can I search for deals in a different area?', a: 'Yes! Use the search bar on the Nearby screen to browse deals by area or category, even outside your current location.' },
                  ],
                },
                {
                  section: 'Deals & Streaks',
                  items: [
                    { q: 'What is a Flash Deal?', a: 'Flash Deals are limited-time offers (usually under 2 hours) with bigger discounts. They appear at the top of your Nearby screen with a countdown timer.' },
                    { q: 'How do streaks work?', a: 'Claim at least one deal per day to build your streak. The longer your streak, the closer you get to unlocking exclusive rewards and badges.' },
                    { q: 'Can I save a deal for later?', a: 'Yes — tap the heart icon on any deal detail page to save it. View your saved deals in the My Deals tab.' },
                  ],
                },
                {
                  section: 'Account & Privacy',
                  items: [
                    { q: 'How do I change my password?', a: 'Currently you can reset your password from the login screen by tapping "Forgot password?".' },
                    { q: 'How do I delete my account?', a: 'Contact us at support@neardeal.ro and we\'ll process your deletion request within 48 hours. All your data will be permanently removed.' },
                    { q: 'Is my data safe?', a: 'Yes. We follow GDPR guidelines, don\'t store location history, and never sell your data. See our privacy policy for full details.' },
                  ],
                },
              ].map((section, sIdx) => (
                <View key={sIdx} className="mb-6">
                  <Text className="text-[13px] font-semibold text-[#8a8a8f] uppercase tracking-wider mb-3">
                    {section.section}
                  </Text>
                  <View className="bg-[#1a1a1f] rounded-2xl overflow-hidden">
                    {section.items.map((item, iIdx) => {
                      const globalIdx = sIdx * 10 + iIdx;
                      const isExpanded = expandedFaq === globalIdx;
                      return (
                        <View key={iIdx}>
                          {iIdx > 0 && <View className="border-b border-[#2a2a30]" />}
                          <Pressable
                            onPress={() => setExpandedFaq(isExpanded ? null : globalIdx)}
                            className="px-4 py-3.5"
                          >
                            <View className="flex-row items-center justify-between">
                              <Text className="text-[14px] text-white flex-1 mr-3" style={{ fontFamily: 'GoogleSans-Medium' }}>
                                {item.q}
                              </Text>
                              <Text className="text-[#666] text-[16px]">
                                {isExpanded ? '\u2212' : '+'}
                              </Text>
                            </View>
                            {isExpanded && (
                              <Text className="text-[13px] text-[#8a8a8f] mt-2 leading-5">
                                {item.a}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Quiet Hours Modal */}
      <Modal visible={quietHoursModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-[#0c0c0f]">
          <SafeAreaView edges={['top']} className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#2a2a30]">
              <Text className="text-[20px] font-bold text-white">Quiet Hours</Text>
              <Pressable
                onPress={() => setQuietHoursModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-[15px] font-semibold text-[#c8e000]">Done</Text>
              </Pressable>
            </View>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
              <Text className="text-[13px] font-semibold text-[#8a8a8f] uppercase tracking-wider mb-2">Start time</Text>
              <View className="bg-[#1a1a1f] rounded-2xl mb-6 overflow-hidden">
                <DateTimePicker
                  value={quietStart}
                  mode="time"
                  display="spinner"
                  themeVariant="dark"
                  onChange={(_event: any, date?: Date) => { if (date) setQuietHours(date.getHours(), quietEndHour); }}
                />
              </View>
              <Text className="text-[13px] font-semibold text-[#8a8a8f] uppercase tracking-wider mb-2">End time</Text>
              <View className="bg-[#1a1a1f] rounded-2xl overflow-hidden">
                <DateTimePicker
                  value={quietEnd}
                  mode="time"
                  display="spinner"
                  themeVariant="dark"
                  onChange={(_event: any, date?: Date) => { if (date) setQuietHours(quietStartHour, date.getHours()); }}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Radius Picker Modal */}
      <Modal visible={radiusPickerOpen} transparent animationType="fade">
        <Pressable
          className="flex-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onPress={() => setRadiusPickerOpen(false)}
        >
          <View className="flex-1" />
          <View style={{ backgroundColor: '#1a1a1f', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text className="text-[13px] text-[#8a8a8f] uppercase tracking-wider text-center pt-4 pb-2">Max radius</Text>
            {[200, 500, 1000, 2000, 5000].map((value) => (
              <View key={value}>
                <View className="border-b border-[#2a2a30]" />
                <Pressable
                  onPress={() => { setMaxRadius(value); setRadiusPickerOpen(false); }}
                  className="px-5 py-4"
                >
                  <Text className={`text-[16px] text-center font-medium ${maxRadius === value ? 'text-[#c8e000]' : 'text-white'}`}>
                    {value >= 1000 ? `${value / 1000}km` : `${value}m`}
                  </Text>
                </Pressable>
              </View>
            ))}
            <View style={{ height: 8, backgroundColor: '#111' }} />
            <Pressable
              onPress={() => setRadiusPickerOpen(false)}
              className="px-5 py-4"
            >
              <Text className="text-[16px] text-[#e03030] text-center font-semibold">Cancel</Text>
            </Pressable>
            <View style={{ height: 20 }} />
          </View>
        </Pressable>
      </Modal>

      {/* Avatar Picker Modal */}
      <Modal visible={avatarPickerOpen} transparent animationType="fade">
        <Pressable
          className="flex-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onPress={() => setAvatarPickerOpen(false)}
        >
          <View className="flex-1" />
          <View style={{ backgroundColor: '#1a1a1f', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Pressable
              onPress={handleTakePhoto}
              className="px-5 py-4"
            >
              <Text className="text-[16px] text-white text-center">Take a photo</Text>
            </Pressable>
            <View className="border-b border-[#2a2a30]" />
            <Pressable
              onPress={handleChooseFromGallery}
              className="px-5 py-4"
            >
              <Text className="text-[16px] text-white text-center">Choose from gallery</Text>
            </Pressable>
            <View style={{ height: 8, backgroundColor: '#111' }} />
            <Pressable
              onPress={() => setAvatarPickerOpen(false)}
              className="px-5 py-4"
            >
              <Text className="text-[16px] text-[#e03030] text-center font-semibold">Cancel</Text>
            </Pressable>
            <View style={{ height: 20 }} />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
