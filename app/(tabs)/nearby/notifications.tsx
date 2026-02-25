import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, PanResponder, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotificationStore, Notification as NotifType, NotificationType } from '@/lib/notification-store';
import {
  ChevronLeftIcon,
  BellIcon,
  MapPinIcon,
  BoltIcon,
  ClockIcon,
  FlameIcon,
  MedalIcon,
} from '@/components/icons/CategoryIcons';

const ICON_MAP: Record<string, { icon: typeof MapPinIcon; color: string }> = {
  new_deal: { icon: MapPinIcon, color: '#c8e000' },
  flash_deal: { icon: BoltIcon, color: '#c8e000' },
  expiring: { icon: ClockIcon, color: '#ef4444' },
  claim: { icon: FlameIcon, color: '#ff9500' },
  system: { icon: MedalIcon, color: '#c8e000' },
  deal: { icon: MapPinIcon, color: '#c8e000' },
  flash: { icon: BoltIcon, color: '#c8e000' },
  streak: { icon: FlameIcon, color: '#ff9500' },
  milestone: { icon: MedalIcon, color: '#c8e000' },
};

const SWIPE_THRESHOLD = -80;

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

function mapNotifToItem(n: NotifType): NotifItem {
  const createdAt = n.createdAt ? new Date(n.createdAt) : new Date();
  const diffMs = Date.now() - createdAt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  let time = '';
  if (diffMin < 1) time = 'Just now';
  else if (diffMin < 60) time = `${diffMin} min ago`;
  else if (diffMin < 1440) time = `${Math.floor(diffMin / 60)}h ago`;
  else time = `${Math.floor(diffMin / 1440)}d ago`;

  return {
    id: n.notifId,
    type: n.type,
    title: n.title,
    body: n.message,
    time,
    read: n.read,
  };
}

function SwipeableRow({ item, onRemove }: { item: NotifItem; onRemove: () => void }) {
  const iconConfig = ICON_MAP[item.type] || ICON_MAP.deal;
  const Icon = iconConfig.icon;
  const color = iconConfig.color;
  const translateX = useRef(new Animated.Value(0)).current;
  const rowHeight = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < SWIPE_THRESHOLD) {
          Animated.timing(translateX, { toValue: -400, duration: 200, useNativeDriver: true }).start(() => {
            Animated.timing(rowHeight, { toValue: 0, duration: 150, useNativeDriver: false }).start(onRemove);
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  return (
    <Animated.View style={{ overflow: 'hidden', maxHeight: rowHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) }}>
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 100, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Delete</Text>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }], backgroundColor: '#0c0c0f' }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingVertical: 14,
            paddingRight: 16,
            paddingLeft: item.read ? 16 : 0,
            borderBottomWidth: 1,
            borderBottomColor: '#2a2a30',
          }}
        >
          {!item.read && (
            <View style={{ width: 3, backgroundColor: '#c8e000', borderRadius: 1.5, alignSelf: 'stretch', marginRight: 13 }} />
          )}
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#222228',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
              marginTop: 2,
            }}
          >
            <Icon size={14} color={color} />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 2 }}>{item.title}</Text>
            <Text style={{ fontSize: 12, color: '#8a8a8f', lineHeight: 16 }} numberOfLines={2}>{item.body}</Text>
            <Text style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{item.time}</Text>
          </View>
          {!item.read && (
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6', marginTop: 6 }} />
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, loading, fetchNotifications, markAllRead, deleteNotification } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  const items = notifications.map(mapNotifToItem);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleRemove = (id: string) => {
    deleteNotification(id);
  };

  const handleClearAll = () => {
    markAllRead();
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0c0c0f' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a30' }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeftIcon size={18} color="#fff" />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Notifications</Text>
        {items.length > 0 ? (
          <Pressable onPress={handleClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#c8e000' }}>Mark read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {loading && items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#c8e000" />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BellIcon size={40} color="#666" />
          <Text style={{ fontSize: 15, color: '#666', marginTop: 12 }}>No notifications yet</Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c8e000" />
          }
        >
          {items.map((item) => (
            <SwipeableRow key={item.id} item={item} onRemove={() => handleRemove(item.id)} />
          ))}
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}
