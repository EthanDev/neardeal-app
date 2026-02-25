import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'validation.emailRequired' })
    .email({ message: 'validation.emailInvalid' }),
  password: z
    .string()
    .min(8, { message: 'validation.passwordMin' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Eye icon primitives (no emoji, pure SVG-like shapes via View)
// ---------------------------------------------------------------------------

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <View className="w-5 h-5 items-center justify-center">
      {visible ? (
        // Eye open: outer oval + pupil dot
        <>
          <View
            className="w-5 h-3 rounded-full border border-[#8a8a8f]"
            style={{ borderWidth: 1.5 }}
          />
          <View
            className="absolute w-1.5 h-1.5 rounded-full bg-[#8a8a8f]"
          />
        </>
      ) : (
        // Eye closed: oval + diagonal slash hint
        <>
          <View
            className="w-5 h-3 rounded-full border border-[#8a8a8f]"
            style={{ borderWidth: 1.5, opacity: 0.4 }}
          />
          <View
            style={{
              position: 'absolute',
              width: 22,
              height: 1.5,
              backgroundColor: '#8a8a8f',
              transform: [{ rotate: '-35deg' }],
            }}
          />
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Globe icon primitive
// ---------------------------------------------------------------------------

function GlobeIcon() {
  return (
    <View className="w-4 h-4 rounded-full border border-[#8a8a8f]" style={{ borderWidth: 1.5 }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: 1.5,
          backgroundColor: '#8a8a8f',
          marginLeft: -0.75,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 1.5,
          backgroundColor: '#8a8a8f',
          marginTop: -0.75,
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, consumerLogin, isLoading, error, clearError } = useAuth();
  const { currentLanguage, changeLanguage } = useLanguage();

  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'consumer' | 'business'>('consumer');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Map zod message keys to translated strings
  function resolveFieldError(message?: string): string | undefined {
    if (!message) return undefined;
    if (message === 'validation.emailRequired') return t('auth.login.email') + ' ' + t('common.error').toLowerCase();
    if (message === 'validation.emailInvalid') return t('auth.login.email') + ': ' + 'invalid format';
    if (message === 'validation.passwordMin') return t('auth.signup.passwordHint');
    return message;
  }

  function toggleLanguage() {
    changeLanguage(currentLanguage === 'ro' ? 'en' : 'ro');
  }

  async function onSubmit(values: LoginFormValues) {
    clearError();
    const success =
      loginMode === 'consumer'
        ? await consumerLogin(values.email, values.password)
        : await login(values.email, values.password);
    if (success) {
      if (loginMode === 'consumer') {
        router.replace('/(tabs)/nearby');
      } else {
        router.replace('/(business)/dashboard');
      }
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0c0c0f]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Language toggle */}
        <View className="flex-row justify-end px-6 pt-14 pb-2">
          <Pressable
            onPress={toggleLanguage}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2a2a30] bg-[#1a1a1f]"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <GlobeIcon />
            <Text className="text-[#8a8a8f] text-sm font-medium">
              {currentLanguage === 'ro' ? 'RO' : 'EN'}
            </Text>
          </Pressable>
        </View>

        {/* Logo */}
        <View className="items-center pt-8 pb-10 px-6">
          <Text
            className="text-[#c8e000] text-5xl font-bold tracking-tight"
            style={{ fontFamily: 'Syne_700Bold' }}
          >
            NearDeal
          </Text>
          {loginMode === 'business' ? (
            <Text className="text-[#8a8a8f] text-lg mt-1 tracking-widest uppercase">
              Business
            </Text>
          ) : (
            <Text className="text-[#8a8a8f] text-lg mt-1 tracking-widest uppercase">
              {t('auth.login.title')}
            </Text>
          )}
        </View>

        {/* Form */}
        <View className="px-6 gap-4">
          {/* Email */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('auth.login.email')}
                placeholder="you@example.com"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                error={resolveFieldError(errors.email?.message)}
              />
            )}
          />

          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('auth.login.password')}
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                error={resolveFieldError(errors.password?.message)}
                rightIcon={
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <EyeIcon visible={showPassword} />
                  </Pressable>
                }
              />
            )}
          />

          {/* Forgot password */}
          <Pressable
            onPress={() => router.push('/(auth)/reset-password')}
            className="self-end"
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
          >
            <Text className="text-[#c8e000] text-sm">
              {t('auth.login.forgot')}
            </Text>
          </Pressable>

          {/* Auth error */}
          {error ? (
            <Text className="text-[#ef4444] text-sm text-center">{error}</Text>
          ) : null}

          {/* Login button */}
          <Button
            variant="primary"
            title={t('auth.login.submit')}
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            size="lg"
          />

          {/* Divider */}
          <View className="flex-row items-center gap-3 my-2">
            <View className="flex-1 h-px bg-[#2a2a30]" />
            <Text className="text-[#8a8a8f] text-sm">
              {`— ${t('auth.login.or')} —`}
            </Text>
            <View className="flex-1 h-px bg-[#2a2a30]" />
          </View>

          {/* Social sign-in — Coming Soon
             TODO: To enable social login, configure:
             - Apple: Apple Developer > Certificates > Sign In with Apple, then add
               cognito.UserPoolIdentityProviderApple to auth-stack.ts
             - Google: Google Cloud Console > OAuth 2.0 Client ID, then add
               cognito.UserPoolIdentityProviderGoogle to auth-stack.ts
             - Facebook: Meta Developer Portal > Facebook Login App, then add
               cognito.UserPoolIdentityProviderFacebook to auth-stack.ts
             After adding identity providers, update the Cognito app client
             supportedIdentityProviders and wire up expo-auth-session or
             expo-web-browser based OAuth flow in this component. */}
          <View className="gap-3" style={{ opacity: 0.5 }}>
            <Button
              variant="secondary"
              title={`${t('auth.login.apple')} — Coming Soon`}
              onPress={() => Alert.alert('Coming Soon', 'Social login coming soon. Please use email login.')}
              disabled={true}
              fullWidth
            />
            <Button
              variant="secondary"
              title={`${t('auth.login.google')} — Coming Soon`}
              onPress={() => Alert.alert('Coming Soon', 'Social login coming soon. Please use email login.')}
              disabled={true}
              fullWidth
            />
            <Button
              variant="secondary"
              title={`${t('auth.login.facebook')} — Coming Soon`}
              onPress={() => Alert.alert('Coming Soon', 'Social login coming soon. Please use email login.')}
              disabled={true}
              fullWidth
            />
          </View>

          {/* Sign up link */}
          <View className="flex-row justify-center items-center gap-1 pt-4">
            <Text className="text-[#8a8a8f] text-sm">
              {t('auth.login.noAccount')}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/signup')}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text className="text-[#c8e000] text-sm font-semibold">
                {t('auth.login.signup')}
              </Text>
            </Pressable>
          </View>

          {/* Business / Consumer toggle */}
          <View className="items-center pt-2 pb-10">
            <Pressable
              onPress={() => {
                clearError();
                setLoginMode((prev) => (prev === 'consumer' ? 'business' : 'consumer'));
              }}
              className="self-center px-5 py-2 rounded-full"
              style={{ backgroundColor: '#c8e000' }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-sm font-semibold" style={{ color: '#111' }}>
                {loginMode === 'consumer' ? "I'm a business" : "I'm a consumer"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
