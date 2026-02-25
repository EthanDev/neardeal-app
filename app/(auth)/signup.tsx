import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const signupSchema = z
  .object({
    name: z.string().min(1, { message: 'validation.required' }),
    email: z
      .string()
      .min(1, { message: 'validation.emailRequired' })
      .email({ message: 'validation.emailInvalid' }),
    password: z
      .string()
      .min(8, { message: 'validation.passwordMin' })
      .regex(/[A-Z]/, { message: 'validation.passwordUppercase' })
      .regex(/[0-9]/, { message: 'validation.passwordNumber' }),
    confirmPassword: z.string().min(1, { message: 'validation.required' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordMismatch',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

const confirmEmailSchema = z.object({
  code: z
    .string()
    .length(6, { message: 'validation.codeLength' })
    .regex(/^\d+$/, { message: 'validation.codeDigits' }),
});

type ConfirmEmailValues = z.infer<typeof confirmEmailSchema>;

// ---------------------------------------------------------------------------
// Eye icon primitive
// ---------------------------------------------------------------------------

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <View className="w-5 h-5 items-center justify-center">
      {visible ? (
        <>
          <View
            className="w-5 h-3 rounded-full border border-[#8a8a8f]"
            style={{ borderWidth: 1.5 }}
          />
          <View className="absolute w-1.5 h-1.5 rounded-full bg-[#8a8a8f]" />
        </>
      ) : (
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
// Password strength helpers
// ---------------------------------------------------------------------------

type PasswordStrength = 'weak' | 'medium' | 'strong';

function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return 'weak';
  if (score <= 2) return 'medium';
  return 'strong';
}

const strengthColors: Record<PasswordStrength, string> = {
  weak: '#ef4444',
  medium: '#f59e0b',
  strong: '#22c55e',
};

function PasswordStrengthBar({
  password,
  weakLabel,
  mediumLabel,
  strongLabel,
}: {
  password: string;
  weakLabel: string;
  mediumLabel: string;
  strongLabel: string;
}) {
  const strength = getPasswordStrength(password);
  if (!strength) return null;

  const label =
    strength === 'weak' ? weakLabel : strength === 'medium' ? mediumLabel : strongLabel;
  const color = strengthColors[strength];
  const filledBars = strength === 'weak' ? 1 : strength === 'medium' ? 2 : 3;

  return (
    <View className="mt-2">
      <View className="flex-row gap-1.5 mb-1">
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            className="flex-1 h-1 rounded-full"
            style={{ backgroundColor: bar <= filledBars ? color : '#2a2a30' }}
          />
        ))}
      </View>
      <Text className="text-xs" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, signup, confirmEmail, isLoading, activeOperation, error, clearError } = useAuth();

  // Flow state
  const [step, setStep] = useState<'form' | 'confirm' | 'logging-in'>('form');
  const [formData, setFormData] = useState<SignupFormValues | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  // ---------------------------------------------------------------------------
  // Confirm email form
  // ---------------------------------------------------------------------------

  const {
    control: controlConfirm,
    handleSubmit: handleSubmitConfirm,
    formState: { errors: errorsConfirm },
  } = useForm<ConfirmEmailValues>({
    resolver: zodResolver(confirmEmailSchema),
    defaultValues: { code: '' },
  });

  // ---------------------------------------------------------------------------
  // Error helpers
  // ---------------------------------------------------------------------------

  function resolveError(message?: string): string | undefined {
    if (!message) return undefined;
    switch (message) {
      case 'validation.required':
        return t('common.error');
      case 'validation.emailRequired':
        return t('auth.signup.email') + ' ' + t('common.error').toLowerCase();
      case 'validation.emailInvalid':
        return t('auth.signup.email') + ': invalid format';
      case 'validation.passwordMin':
        return t('auth.signup.passwordHint');
      case 'validation.passwordUppercase':
        return 'Password must contain at least one uppercase letter';
      case 'validation.passwordNumber':
        return 'Password must contain at least one number';
      case 'validation.passwordMismatch':
        return 'Passwords do not match';
      case 'validation.codeLength':
        return 'Code must be exactly 6 digits';
      case 'validation.codeDigits':
        return 'Code must contain digits only';
      default:
        return message;
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function onFormSubmit(values: SignupFormValues) {
    clearError();
    setFormData(values);

    const success = await signup(values.email, values.password, {
      businessName: values.name,
      ownerName: values.name,
      category: '',
      address: '',
      city: '',
      district: '',
    });

    if (success) {
      setSubmittedEmail(values.email);
      setStep('confirm');
    }
  }

  async function onConfirmSubmit(values: ConfirmEmailValues) {
    clearError();
    const confirmed = await confirmEmail(submittedEmail, values.code);
    if (confirmed && formData) {
      // Auto-login after confirmation
      setStep('logging-in');
      const loggedIn = await login(formData.email, formData.password);
      if (loggedIn) {
        toast.success(t('auth.signup.confirmEmail.successMessage'));
        router.replace('/(tabs)/nearby');
      } else {
        // Fallback: send to login if auto-login fails
        toast.success(t('auth.signup.confirmEmail.successMessage'));
        router.replace('/(auth)/login');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Logging-in spinner
  // ---------------------------------------------------------------------------

  if (step === 'logging-in') {
    return (
      <View className="flex-1 bg-[#0c0c0f] items-center justify-center">
        <ActivityIndicator size="large" color="#c8e000" />
        <Text className="text-[#8a8a8f] text-base mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Confirm email screen
  // ---------------------------------------------------------------------------

  if (step === 'confirm') {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-[#0c0c0f]"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-20 pb-10 gap-6">
            {/* Header */}
            <View className="items-center pb-4">
              <Text
                className="text-[#c8e000] text-4xl font-bold tracking-tight"
                style={{ fontFamily: 'Syne_700Bold' }}
              >
                NearDeal
              </Text>
            </View>

            {/* Icon area */}
            <View className="items-center pt-2 pb-4">
              <View className="w-16 h-16 rounded-full bg-[#1a1a1f] border-2 border-[#c8e000] items-center justify-center mb-4">
                <View className="w-8 h-6 border-2 border-[#c8e000] rounded-sm items-center justify-center">
                  <View className="w-4 h-0.5 bg-[#c8e000] mb-0.5" />
                  <View className="w-4 h-0.5 bg-[#c8e000]" />
                </View>
              </View>
              <Text className="text-white text-xl font-semibold text-center">
                {t('auth.signup.confirmEmail.title')}
              </Text>
              <Text className="text-[#8a8a8f] text-sm text-center mt-2 leading-5">
                {t('auth.signup.confirmEmail.subtitle')}
              </Text>
              <Text className="text-[#c8e000] text-sm font-medium text-center mt-1">
                {submittedEmail}
              </Text>
            </View>

            {/* Code input */}
            <Controller
              control={controlConfirm}
              name="code"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('auth.signup.confirmEmail.code')}
                  placeholder={t('auth.signup.confirmEmail.codePlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  error={resolveError(errorsConfirm.code?.message)}
                />
              )}
            />

            {/* Auth error */}
            {error ? (
              <Text className="text-[#ef4444] text-sm text-center">{error}</Text>
            ) : null}

            {/* Verify button */}
            <Button
              variant="primary"
              title={t('auth.signup.confirmEmail.submit')}
              onPress={handleSubmitConfirm(onConfirmSubmit)}
              loading={activeOperation === 'confirmSignUp'}
              disabled={isLoading}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0c0c0f]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-14 pb-10 gap-6">
          {/* Logo */}
          <View className="items-center pb-2">
            <Text
              className="text-[#c8e000] text-4xl font-bold tracking-tight"
              style={{ fontFamily: 'Syne_700Bold' }}
            >
              NearDeal
            </Text>
          </View>

          {/* Title */}
          <Text className="text-white text-2xl font-bold text-center">
            {t('auth.signup.title')}
          </Text>

          <View className="gap-4">
            {/* Name */}
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('auth.signup.ownerName')}
                  placeholder={t('auth.signup.ownerName')}
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="words"
                  error={resolveError(errors.name?.message)}
                />
              )}
            />

            {/* Email */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('auth.signup.email')}
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={resolveError(errors.email?.message)}
                />
              )}
            />

            {/* Password */}
            <View>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t('auth.signup.password')}
                    placeholder="••••••••"
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    error={resolveError(errors.password?.message)}
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
              <PasswordStrengthBar
                password={passwordValue}
                weakLabel={t('auth.signup.passwordWeak')}
                mediumLabel={t('auth.signup.passwordMedium')}
                strongLabel={t('auth.signup.passwordStrong')}
              />
            </View>

            {/* Confirm password */}
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('auth.signup.confirmPassword')}
                  placeholder="••••••••"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  error={resolveError(errors.confirmPassword?.message)}
                  rightIcon={
                    <Pressable
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <EyeIcon visible={showConfirmPassword} />
                    </Pressable>
                  }
                />
              )}
            />

            {/* Auth error */}
            {error ? (
              <Text className="text-[#ef4444] text-sm text-center">{error}</Text>
            ) : null}

            {/* Sign up button */}
            <Button
              variant="primary"
              title={t('auth.signup.submit')}
              onPress={handleSubmit(onFormSubmit)}
              loading={activeOperation === 'signup'}
              disabled={isLoading}
              fullWidth
              size="lg"
            />

            {/* Divider */}
            <View className="flex-row items-center gap-3 my-1">
              <View className="flex-1 h-px bg-[#2a2a30]" />
              <Text className="text-[#8a8a8f] text-sm">
                {`— ${t('auth.login.or')} —`}
              </Text>
              <View className="flex-1 h-px bg-[#2a2a30]" />
            </View>

            {/* Social sign-in */}
            <View className="gap-3">
              <Button
                variant="secondary"
                title={t('auth.login.apple')}
                onPress={() => {}}
                fullWidth
              />
              <Button
                variant="secondary"
                title={t('auth.login.google')}
                onPress={() => {}}
                fullWidth
              />
              <Button
                variant="secondary"
                title={t('auth.login.facebook')}
                onPress={() => {}}
                fullWidth
              />
            </View>

            {/* Already have account */}
            <View className="flex-row justify-center items-center gap-1 pt-2">
              <Text className="text-[#8a8a8f] text-sm">
                {t('auth.signup.hasAccount')}
              </Text>
              <Pressable
                onPress={() => router.replace('/(auth)/login')}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text className="text-[#c8e000] text-sm font-semibold">
                  {t('auth.signup.login')}
                </Text>
              </Pressable>
            </View>

            {/* Business signup link */}
            <View className="items-center pt-2 pb-4">
              <Pressable
                onPress={() => router.push('/(auth)/business-signup')}
                className="self-center px-5 py-2 rounded-full"
                style={{ backgroundColor: '#c8e000' }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-sm font-semibold" style={{ color: '#111' }}>
                  {"I'm a business →"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
