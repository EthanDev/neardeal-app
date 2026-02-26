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

const Feather = require('@expo/vector-icons/Feather').default;

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StepIndicator } from '../../components/ui/StepIndicator';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'restaurant',
  'cafe',
  'retail',
  'beauty',
  'fitness',
  'entertainment',
  'services',
  'other',
] as const;

type Category = (typeof CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const step1Schema = z
  .object({
    businessName: z.string().min(1, { message: 'validation.required' }),
    ownerName: z.string().min(1, { message: 'validation.required' }),
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

const step2Schema = z.object({
  category: z.string().min(1, { message: 'validation.required' }),
  address: z.string().min(1, { message: 'validation.required' }),
  city: z.string().min(1, { message: 'validation.required' }),
  district: z.string().min(1, { message: 'validation.required' }),
});

const confirmEmailSchema = z.object({
  code: z
    .string()
    .length(6, { message: 'validation.codeLength' })
    .regex(/^\d+$/, { message: 'validation.codeDigits' }),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type ConfirmEmailValues = z.infer<typeof confirmEmailSchema>;

// ---------------------------------------------------------------------------
// Eye icon primitive
// ---------------------------------------------------------------------------

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <Feather name={visible ? 'eye' : 'eye-off'} size={18} color="#8a8a8f" />
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
// Category picker row
// ---------------------------------------------------------------------------

function CategoryRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'flex-row items-center justify-between py-3.5 px-1 border-b border-[#2a2a30]',
      ].join(' ')}
    >
      <Text className={selected ? 'text-[#c8e000] font-semibold' : 'text-white'}>{label}</Text>
      {selected && (
        <View className="w-5 h-5 rounded-full bg-[#c8e000] items-center justify-center">
          <Feather name="check" size={12} color="#0c0c0f" />
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function BusinessSignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login, signup, confirmEmail, isLoading, activeOperation, error, clearError } = useAuth();

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 'confirm' | 'logging-in'>(1);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Values | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);

  // ---------------------------------------------------------------------------
  // Step 1 form
  // ---------------------------------------------------------------------------

  const {
    control: control1,
    handleSubmit: handleSubmit1,
    watch: watch1,
    formState: { errors: errors1 },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      businessName: '',
      ownerName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch1('password');

  // ---------------------------------------------------------------------------
  // Step 2 form
  // ---------------------------------------------------------------------------

  const {
    control: control2,
    handleSubmit: handleSubmit2,
    setValue: setValue2,
    watch: watch2,
    formState: { errors: errors2 },
  } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      category: '',
      address: '',
      city: 'Bucharest',
      district: '',
    },
  });

  const selectedCategory = watch2('category') as Category | '';

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
        return t('auth.signup.email') + ': ' + t('auth.validation.invalidFormat', 'invalid format');
      case 'validation.passwordMin':
        return t('auth.signup.passwordHint');
      case 'validation.passwordUppercase':
        return t('auth.validation.passwordUppercase', 'Password must contain at least one uppercase letter');
      case 'validation.passwordNumber':
        return t('auth.validation.passwordNumber', 'Password must contain at least one number');
      case 'validation.passwordMismatch':
        return t('auth.validation.passwordMismatch', 'Passwords do not match');
      case 'validation.codeLength':
        return t('auth.validation.codeLength', 'Code must be exactly 6 digits');
      case 'validation.codeDigits':
        return t('auth.validation.codeDigits', 'Code must contain digits only');
      default:
        return message;
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function onStep1Next(values: Step1Values) {
    clearError();
    setStep1Data(values);
    setStep(2);
  }

  async function onStep2Submit(values: Step2Values) {
    if (!step1Data) return;
    clearError();
    setStep2Data(values);

    const success = await signup(step1Data.email, step1Data.password, {
      businessName: step1Data.businessName,
      ownerName: step1Data.ownerName,
      category: values.category,
      address: values.address,
      city: values.city,
      district: values.district,
    });

    if (success) {
      setSubmittedEmail(step1Data.email);
      setStep('confirm');
    }
  }

  async function onConfirmSubmit(values: ConfirmEmailValues) {
    clearError();
    const confirmed = await confirmEmail(submittedEmail, values.code);
    if (confirmed && step1Data) {
      // Auto-login after confirmation
      setStep('logging-in');
      const loggedIn = await login(step1Data.email, step1Data.password);
      if (loggedIn) {
        toast.success(t('auth.signup.confirmEmail.successMessage'));
        router.replace('/(business)/dashboard');
      } else {
        // Fallback: send to login if auto-login fails
        toast.success(t('auth.signup.confirmEmail.successMessage'));
        router.replace('/(auth)/login');
      }
    }
  }

  function getCategoryLabel(key: string): string {
    return t(`auth.signup.categories.${key}`);
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const stepLabels = [t('auth.signup.step1'), t('auth.signup.step2')];

  // ---------------------------------------------------------------------------
  // Confirm email screen
  // ---------------------------------------------------------------------------

  if (step === 'logging-in') {
    return (
      <View className="flex-1 bg-[#0c0c0f] items-center justify-center">
        <ActivityIndicator size="large" color="#c8e000" />
        <Text className="text-[#8a8a8f] text-base mt-4">{t('common.loading')}</Text>
      </View>
    );
  }

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
                style={{ fontFamily: 'GoogleSans-Bold' }}
              >
                NearDeal
              </Text>
              <Text className="text-[#8a8a8f] text-base tracking-widest uppercase mt-1">
                Business
              </Text>
            </View>

            {/* Icon area */}
            <View className="items-center pt-2 pb-4">
              <View className="w-16 h-16 rounded-full bg-[#1a1a1f] border-2 border-[#c8e000] items-center justify-center mb-4">
                <Feather name="mail" size={28} color="#c8e000" />
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
  // Main wizard
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
        <View className="px-6 pt-14 pb-10 gap-5">
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="flex-row items-center"
          >
            <View className="flex-row items-center">
              <Feather name="arrow-left" size={16} color="#8a8a8f" />
              <Text className="text-[#8a8a8f] text-sm ml-1">{t('common.back', { defaultValue: 'Back' })}</Text>
            </View>
          </Pressable>

          {/* Logo */}
          <View className="items-center">
            <Text
              className="text-[#c8e000] text-3xl font-bold tracking-tight"
              style={{ fontFamily: 'GoogleSans-Bold' }}
            >
              NearDeal
            </Text>
            <Text className="text-[#8a8a8f] text-xs tracking-widest uppercase mt-0.5">
              {t('auth.business', 'Business')}
            </Text>
          </View>

          {/* Title */}
          <Text className="text-white text-xl font-bold text-center">
            {t('auth.signup.title')}
          </Text>

          {/* Step indicator */}
          <StepIndicator steps={2} currentStep={step as number} labels={stepLabels} />

          {/* ----------------------------------------------------------------
              Step 1 - Account Info
          ---------------------------------------------------------------- */}
          {step === 1 && (
            <View className="gap-4">
              {/* Business name */}
              <Controller
                control={control1}
                name="businessName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t('auth.signup.businessName')}
                    placeholder={t('auth.signup.businessName')}
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                    autoFocus
                    error={resolveError(errors1.businessName?.message)}
                  />
                )}
              />

              {/* Owner name */}
              <Controller
                control={control1}
                name="ownerName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t('auth.signup.ownerName')}
                    placeholder={t('auth.signup.ownerName')}
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                    error={resolveError(errors1.ownerName?.message)}
                  />
                )}
              />

              {/* Email */}
              <Controller
                control={control1}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t('auth.signup.email')}
                    placeholder="you@example.com"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={resolveError(errors1.email?.message)}
                  />
                )}
              />

              {/* Password */}
              <View>
                <Controller
                  control={control1}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t('auth.signup.password')}
                      placeholder="••••••••"
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      error={resolveError(errors1.password?.message)}
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
                control={control1}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t('auth.signup.confirmPassword')}
                    placeholder="••••••••"
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    error={resolveError(errors1.confirmPassword?.message)}
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

              {/* Next button */}
              <Button
                variant="primary"
                title={t('auth.signup.next')}
                onPress={handleSubmit1(onStep1Next)}
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
            </View>
          )}

          {/* ----------------------------------------------------------------
              Step 2 - Business Details
          ---------------------------------------------------------------- */}
          {step === 2 && (
            <View className="gap-4">
              {/* Category picker */}
              <View className="w-full">
                <Text className="text-[#8a8a8f] text-sm mb-1.5 font-medium">
                  {t('auth.signup.category')}
                </Text>
                <Pressable
                  onPress={() => setCategorySheetVisible(true)}
                  className={[
                    'flex-row items-center justify-between bg-[#1a1a1f] rounded-lg border h-12 px-3',
                    errors2.category ? 'border-[#ef4444]' : 'border-[#2a2a30]',
                  ].join(' ')}
                >
                  <Text
                    className={
                      selectedCategory ? 'text-white text-base' : 'text-[#8a8a8f] text-base'
                    }
                  >
                    {selectedCategory
                      ? getCategoryLabel(selectedCategory)
                      : t('auth.signup.selectCategory')}
                  </Text>
                  <Feather name="chevron-down" size={18} color="#8a8a8f" />
                </Pressable>
                {errors2.category ? (
                  <Text className="text-[#ef4444] text-xs mt-1">
                    {resolveError(errors2.category?.message)}
                  </Text>
                ) : null}
              </View>

              {/* Address */}
              <Controller
                control={control2}
                name="address"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t('auth.signup.address')}
                    placeholder={t('auth.signup.address')}
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="sentences"
                    error={resolveError(errors2.address?.message)}
                  />
                )}
              />

              {/* City */}
              <Controller
                control={control2}
                name="city"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t('auth.signup.city')}
                    placeholder={t('auth.signup.city')}
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                    error={resolveError(errors2.city?.message)}
                  />
                )}
              />

              {/* District */}
              <Controller
                control={control2}
                name="district"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t('auth.signup.district')}
                    placeholder={t('auth.signup.district')}
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                    error={resolveError(errors2.district?.message)}
                  />
                )}
              />

              {/* Auth error */}
              {error ? (
                <Text className="text-[#ef4444] text-sm text-center">{error}</Text>
              ) : null}

              {/* Actions */}
              <View className="flex-row gap-3 pt-2">
                <View className="flex-1">
                  <Button
                    variant="ghost"
                    title={t('auth.signup.back')}
                    onPress={() => {
                      clearError();
                      setStep(1);
                    }}
                    fullWidth
                    size="lg"
                  />
                </View>
                <View className="flex-1">
                  <Button
                    variant="primary"
                    title={t('auth.signup.submit')}
                    onPress={handleSubmit2(onStep2Submit)}
                    loading={activeOperation === 'signup'}
                    disabled={isLoading}
                    fullWidth
                    size="lg"
                  />
                </View>
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
            </View>
          )}
        </View>
      </ScrollView>

      {/* Category bottom sheet */}
      <BottomSheet
        visible={categorySheetVisible}
        onClose={() => setCategorySheetVisible(false)}
        title={t('auth.signup.category')}
      >
        <View>
          {CATEGORIES.map((cat) => (
            <CategoryRow
              key={cat}
              label={getCategoryLabel(cat)}
              selected={selectedCategory === cat}
              onPress={() => {
                setValue2('category', cat, { shouldValidate: true });
                setCategorySheetVisible(false);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}
