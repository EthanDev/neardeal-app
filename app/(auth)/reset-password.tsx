import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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
import { toast } from '../../components/ui/Toast';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const emailSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'validation.emailRequired' })
    .email({ message: 'validation.emailInvalid' }),
});

const resetSchema = z
  .object({
    code: z
      .string()
      .length(6, { message: 'validation.codeLength' })
      .regex(/^\d{6}$/, { message: 'validation.codeNumeric' }),
    password: z
      .string()
      .min(8, { message: 'validation.passwordMin' })
      .regex(/[A-Z]/, { message: 'validation.passwordUppercase' })
      .regex(/[0-9]/, { message: 'validation.passwordNumber' }),
    confirmPassword: z.string().min(1, { message: 'validation.confirmRequired' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordsMismatch',
    path: ['confirmPassword'],
  });

type EmailFormValues = z.infer<typeof emailSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

// ---------------------------------------------------------------------------
// Back arrow icon
// ---------------------------------------------------------------------------

function BackArrowIcon() {
  return (
    <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
      {/* Chevron left: two lines meeting at a point */}
      <View
        style={{
          position: 'absolute',
          width: 10,
          height: 1.5,
          backgroundColor: '#ffffff',
          borderRadius: 1,
          transform: [{ rotate: '45deg' }, { translateY: -3.5 }],
          top: '50%',
          left: 3,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 10,
          height: 1.5,
          backgroundColor: '#ffffff',
          borderRadius: 1,
          transform: [{ rotate: '-45deg' }, { translateY: 3.5 }],
          top: '50%',
          left: 3,
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Eye icon
// ---------------------------------------------------------------------------

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      {visible ? (
        <>
          <View
            style={{
              width: 20,
              height: 12,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: '#8a8a8f',
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#8a8a8f',
            }}
          />
        </>
      ) : (
        <>
          <View
            style={{
              width: 20,
              height: 12,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: '#8a8a8f',
              opacity: 0.4,
            }}
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
// Helpers
// ---------------------------------------------------------------------------

function resolveFieldError(t: (key: string) => string, message?: string): string | undefined {
  if (!message) return undefined;
  const map: Record<string, string> = {
    'validation.emailRequired': t('auth.reset.email') + ' ' + t('auth.validation.emailRequired', 'is required'),
    'validation.emailInvalid': t('auth.reset.email') + ': ' + t('auth.validation.invalidFormat', 'invalid format'),
    'validation.codeLength': t('auth.validation.codeLength', 'Code must be exactly 6 digits'),
    'validation.codeNumeric': t('auth.validation.codeNumeric', 'Code must contain only digits'),
    'validation.passwordMin': t('auth.signup.passwordHint'),
    'validation.passwordUppercase': t('auth.validation.passwordUppercase', 'Password must contain an uppercase letter'),
    'validation.passwordNumber': t('auth.validation.passwordNumber', 'Password must contain a number'),
    'validation.confirmRequired': t('auth.reset.confirmPassword') + ' ' + t('auth.validation.confirmRequired', 'is required'),
    'validation.passwordsMismatch': t('auth.validation.passwordMismatch', 'Passwords do not match'),
  };
  return map[message] ?? message;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { sendResetCode, confirmReset, isLoading, activeOperation, error, clearError } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1 form
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  // Step 2 form
  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  // ------ Step 1 submit ------
  async function onSendCode(values: EmailFormValues) {
    clearError();
    const success = await sendResetCode(values.email);
    if (success) {
      setSubmittedEmail(values.email);
      setStep(2);
      toast.success(t('auth.reset.codeSent'));
    }
  }

  // ------ Step 2 submit ------
  async function onResetPassword(values: ResetFormValues) {
    clearError();
    const success = await confirmReset(submittedEmail, values.code, values.password);
    if (success) {
      toast.success(t('auth.reset.submit') + ' — ' + t('common.done'));
      router.replace('/(auth)/login');
    }
  }

  // ------ Step 2 back ------
  function goBackToStep1() {
    clearError();
    resetForm.reset();
    setStep(1);
  }

  const isSendingCode = activeOperation === 'sendResetCode';
  const isResetting = activeOperation === 'confirmReset';

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
        {/* Header row with back arrow */}
        <View className="flex-row items-center px-6 pt-14 pb-2">
          <Pressable
            onPress={step === 1 ? () => router.back() : goBackToStep1}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-10 h-10 items-center justify-center rounded-full bg-[#1a1a1f]"
          >
            <BackArrowIcon />
          </Pressable>
        </View>

        {/* Content */}
        <View className="px-6 pt-8 gap-6 pb-12">
          {step === 1 ? (
            // ----------------------------------------------------------------
            // Step 1 — Enter email
            // ----------------------------------------------------------------
            <>
              <View className="gap-2">
                <Text
                  className="text-white text-3xl font-bold"
                  style={{ fontFamily: 'Syne_700Bold' }}
                >
                  {t('auth.reset.title')}
                </Text>
                <Text className="text-[#8a8a8f] text-base leading-6">
                  {t('auth.reset.codeSent')}
                </Text>
              </View>

              <View className="gap-4">
                <Controller
                  control={emailForm.control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t('auth.reset.email')}
                      placeholder="you@example.com"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={resolveFieldError(t, emailForm.formState.errors.email?.message)}
                    />
                  )}
                />

                {error ? (
                  <Text className="text-[#ef4444] text-sm">{error}</Text>
                ) : null}

                <Button
                  variant="primary"
                  title={t('auth.reset.sendCode')}
                  onPress={emailForm.handleSubmit(onSendCode)}
                  loading={isSendingCode}
                  disabled={isLoading}
                  fullWidth
                  size="lg"
                />
              </View>
            </>
          ) : (
            // ----------------------------------------------------------------
            // Step 2 — New password
            // ----------------------------------------------------------------
            <>
              <View className="gap-2">
                <Text
                  className="text-white text-3xl font-bold"
                  style={{ fontFamily: 'Syne_700Bold' }}
                >
                  {t('auth.reset.title')}
                </Text>
                <Text className="text-[#8a8a8f] text-base leading-6">
                  {t('auth.reset.codeSent')}
                </Text>
              </View>

              <View className="gap-4">
                {/* Verification code */}
                <Controller
                  control={resetForm.control}
                  name="code"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="w-full">
                      <Text className="text-[#8a8a8f] text-sm mb-1.5 font-medium">
                        {t('auth.reset.code')}
                      </Text>
                      <View
                        className="flex-row items-center bg-[#1a1a1f] rounded-lg border border-[#2a2a30] px-3 h-12"
                      >
                        <TextInput
                          className="flex-1 text-base"
                          style={{ color: '#ffffff' }}
                          placeholder={t('auth.signup.confirmEmail.codePlaceholder')}
                          placeholderTextColor="#8a8a8f"
                          value={value}
                          onChangeText={(text) => {
                            // Only allow digits, max 6
                            const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                            onChange(cleaned);
                          }}
                          onBlur={onBlur}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoCorrect={false}
                          autoComplete="one-time-code"
                        />
                      </View>
                      {resetForm.formState.errors.code?.message ? (
                        <Text className="text-[#ef4444] text-xs mt-1">
                          {resolveFieldError(t, resetForm.formState.errors.code.message)}
                        </Text>
                      ) : null}
                    </View>
                  )}
                />

                {/* New password */}
                <Controller
                  control={resetForm.control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t('auth.reset.newPassword')}
                      placeholder="••••••••"
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      error={resolveFieldError(t, resetForm.formState.errors.password?.message)}
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

                {/* Confirm password */}
                <Controller
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t('auth.reset.confirmPassword')}
                      placeholder="••••••••"
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      error={resolveFieldError(
                        t,
                        resetForm.formState.errors.confirmPassword?.message,
                      )}
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

                {error ? (
                  <Text className="text-[#ef4444] text-sm">{error}</Text>
                ) : null}

                <Button
                  variant="primary"
                  title={t('auth.reset.submit')}
                  onPress={resetForm.handleSubmit(onResetPassword)}
                  loading={isResetting}
                  disabled={isLoading}
                  fullWidth
                  size="lg"
                />

                <Button
                  variant="ghost"
                  title={t('common.back')}
                  onPress={goBackToStep1}
                  disabled={isLoading}
                  fullWidth
                  size="lg"
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
