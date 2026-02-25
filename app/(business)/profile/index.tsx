import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Header from '@/components/nav/Header';
import { useAuthStore, useUiStore } from '@/lib/store';
import { api } from '@/lib/api';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-[#8a8a8f] text-xs font-semibold uppercase tracking-wider mb-2 px-4">
      {title}
    </Text>
  );
}

function MenuItem({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3.5 bg-[#1a1a1f] border-b border-[#2a2a30]"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Text
        className={`text-base ${destructive ? 'text-[#ef4444]' : 'text-white'}`}
      >
        {label}
      </Text>
      {!destructive && (
        <Text className="text-[#8a8a8f] text-base">{'>'}</Text>
      )}
    </Pressable>
  );
}

export default function BusinessProfileScreen() {
  const { t } = useTranslation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const businessName = (user as any)?.businessName ?? 'My Business';

  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(businessName);
  const [editAddress, setEditAddress] = useState((user as any)?.address ?? '');
  const [editPhone, setEditPhone] = useState((user as any)?.phone ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditProfile = () => {
    setEditName(businessName);
    setEditAddress((user as any)?.address ?? '');
    setEditPhone((user as any)?.phone ?? '');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await api.put('/business/profile', {
        businessName: editName,
        address: editAddress,
        phone: editPhone,
      });
      setIsEditing(false);
    } catch {
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('profile.saveFailed', { defaultValue: 'Failed to save profile. Please try again.' }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSettings = () => {
    Alert.alert(
      t('profile.settings', { defaultValue: 'Settings' }),
      '',
      [
        {
          text: t('profile.notifications', { defaultValue: 'Notifications' }),
          onPress: () => {
            Alert.alert(
              t('profile.notifications', { defaultValue: 'Notifications' }),
              t('profile.notificationsDesc', { defaultValue: 'Push notification preferences coming soon.' }),
            );
          },
        },
        {
          text: language === 'ro'
            ? t('profile.switchToEnglish', { defaultValue: 'Switch to English' })
            : t('profile.switchToRomanian', { defaultValue: 'Switch to Romanian' }),
          onPress: () => setLanguage(language === 'ro' ? 'en' : 'ro'),
        },
        {
          text: t('common.cancel', { defaultValue: 'Cancel' }),
          style: 'cancel',
        },
      ],
    );
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-[#0c0c0f]">
      <Header title={t('profile.title', { defaultValue: 'Profile' })} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Business identity */}
        <View className="items-center py-8">
          <View className="w-20 h-20 rounded-full bg-[#1a1a1f] border-2 border-[#c8e000] items-center justify-center mb-3">
            <Text className="text-3xl text-[#c8e000]">
              {businessName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-white text-lg font-semibold">{businessName}</Text>
        </View>

        {/* Inline edit form */}
        {isEditing && (
          <View className="mx-4 mb-6 bg-[#1a1a1f] rounded-xl p-4">
            <Text className="text-white text-base font-semibold mb-4">
              {t('profile.editProfile', { defaultValue: 'Edit Profile' })}
            </Text>

            <Text className="text-[#8a8a8f] text-xs mb-1">
              {t('profile.businessName', { defaultValue: 'Business Name' })}
            </Text>
            <TextInput
              className="bg-[#0c0c0f] text-white px-3 py-2.5 rounded-lg mb-3 border border-[#2a2a30]"
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor="#8a8a8f"
            />

            <Text className="text-[#8a8a8f] text-xs mb-1">
              {t('profile.address', { defaultValue: 'Address' })}
            </Text>
            <TextInput
              className="bg-[#0c0c0f] text-white px-3 py-2.5 rounded-lg mb-3 border border-[#2a2a30]"
              value={editAddress}
              onChangeText={setEditAddress}
              placeholderTextColor="#8a8a8f"
            />

            <Text className="text-[#8a8a8f] text-xs mb-1">
              {t('profile.phone', { defaultValue: 'Phone' })}
            </Text>
            <TextInput
              className="bg-[#0c0c0f] text-white px-3 py-2.5 rounded-lg mb-3 border border-[#2a2a30]"
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#8a8a8f"
            />

            <View className="flex-row gap-3 mt-2">
              <Pressable
                onPress={handleCancelEdit}
                className="flex-1 py-3 rounded-lg bg-[#2a2a30] items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-white text-sm font-semibold">
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 py-3 rounded-lg bg-[#c8e000] items-center"
                style={({ pressed }) => ({ opacity: pressed || isSaving ? 0.7 : 1 })}
              >
                <Text className="text-[#0c0c0f] text-sm font-semibold">
                  {isSaving
                    ? t('common.saving', { defaultValue: 'Saving...' })
                    : t('common.save', { defaultValue: 'Save' })}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Business section */}
        <SectionHeader title={t('profile.business', { defaultValue: 'Business' })} />
        <View className="mb-6">
          <MenuItem
            label={t('profile.analytics', { defaultValue: 'Analytics' })}
            onPress={() => router.push('/(business)/profile/analytics')}
          />
          <MenuItem
            label={t('profile.subscription', { defaultValue: 'Subscription' })}
            onPress={() => router.push('/(business)/profile/subscription')}
          />
        </View>

        {/* Account section */}
        <SectionHeader title={t('profile.account', { defaultValue: 'Account' })} />
        <View className="mb-6">
          <MenuItem
            label={t('profile.editProfile', { defaultValue: 'Edit Profile' })}
            onPress={handleEditProfile}
          />
          <MenuItem
            label={t('profile.settings', { defaultValue: 'Settings' })}
            onPress={handleSettings}
          />
        </View>

        {/* Logout */}
        <View className="mt-4">
          <MenuItem
            label={t('auth.logout', { defaultValue: 'Log Out' })}
            onPress={handleLogout}
            destructive
          />
        </View>
      </ScrollView>
    </View>
  );
}
