import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

const Feather = require('@expo/vector-icons/Feather').default;

import Header from '@/components/nav/Header';
import { Button } from '@/components/ui/Button';
import { useAuthStore, useUiStore } from '@/lib/store';
import { api } from '@/lib/api';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2 px-4">
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
      onPress={() => {
        const style = destructive
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Light;
        Haptics.impactAsync(style);
        onPress();
      }}
      className="flex-row items-center justify-between px-4 py-3.5 bg-surface border-b border-border"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Text
        className={`text-base ${destructive ? 'text-error' : 'text-white'}`}
      >
        {label}
      </Text>
      {!destructive && (
        <Feather name="chevron-right" size={18} color="#8a8a8f" />
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
    <View className="flex-1 bg-bg">
      <Header title={t('profile.title', { defaultValue: 'Profile' })} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Business identity */}
        <View className="items-center py-8">
          <View className="w-20 h-20 rounded-full bg-surface border-2 border-accent items-center justify-center mb-3">
            <Text className="text-3xl text-accent">
              {businessName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-white text-lg font-semibold">{businessName}</Text>
        </View>

        {/* Inline edit form */}
        {isEditing && (
          <View className="mx-4 mb-6 bg-surface rounded-xl p-4">
            <Text className="text-white text-base font-semibold mb-4">
              {t('profile.editProfile', { defaultValue: 'Edit Profile' })}
            </Text>

            <Text className="text-text-secondary text-xs mb-1">
              {t('profile.businessName', { defaultValue: 'Business Name' })}
            </Text>
            <TextInput
              className="bg-bg text-white px-3 py-2.5 rounded-lg mb-3 border border-border"
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor="#8a8a8f"
              textContentType="none"
              autoFocus
            />

            <Text className="text-text-secondary text-xs mb-1">
              {t('profile.address', { defaultValue: 'Address' })}
            </Text>
            <TextInput
              className="bg-bg text-white px-3 py-2.5 rounded-lg mb-3 border border-border"
              value={editAddress}
              onChangeText={setEditAddress}
              placeholderTextColor="#8a8a8f"
              textContentType="none"
            />

            <Text className="text-text-secondary text-xs mb-1">
              {t('profile.phone', { defaultValue: 'Phone' })}
            </Text>
            <TextInput
              className="bg-bg text-white px-3 py-2.5 rounded-lg mb-3 border border-border"
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#8a8a8f"
              textContentType="none"
            />

            <View className="flex-row gap-3 mt-2">
              <View className="flex-1">
                <Button
                  variant="secondary"
                  size="md"
                  title={t('common.cancel', { defaultValue: 'Cancel' })}
                  onPress={handleCancelEdit}
                  fullWidth
                />
              </View>
              <View className="flex-1">
                <Button
                  variant="primary"
                  size="md"
                  title={isSaving
                    ? t('common.saving', { defaultValue: 'Saving...' })
                    : t('common.save', { defaultValue: 'Save' })}
                  onPress={handleSaveProfile}
                  loading={isSaving}
                  disabled={isSaving}
                  fullWidth
                />
              </View>
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
