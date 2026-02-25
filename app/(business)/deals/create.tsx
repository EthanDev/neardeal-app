import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Header from '@/components/nav/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DiscountType = 'percentage' | 'fixed';

interface DealFormData {
  // Step 1: Basic Info
  title: string;
  description: string;
  category: string;
  // Step 2: Pricing
  discountType: DiscountType;
  discountValue: string;
  originalPrice: string;
  discountedPrice: string;
  // Step 3: Terms
  maxClaims: string;
  terms: string;
  isFlash: boolean;
  expiresAt: string;
  // Step 4: Location
  address: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
}

const INITIAL_FORM: DealFormData = {
  title: '',
  description: '',
  category: '',
  discountType: 'percentage',
  discountValue: '',
  originalPrice: '',
  discountedPrice: '',
  maxClaims: '',
  terms: '',
  isFlash: false,
  expiresAt: '',
  address: '',
  city: 'Bucharest',
  district: '',
  latitude: '',
  longitude: '',
};

const CATEGORIES = [
  'Restaurant',
  'Cafe',
  'Beauty',
  'Fitness',
  'Retail',
  'Entertainment',
  'Services',
  'Other',
];

const STEP_COUNT = 5;
const STEP_LABELS = ['Basic', 'Pricing', 'Terms', 'Location', 'Preview'];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateStep(step: number, form: DealFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 1) {
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    if (!form.category) errors.category = 'Select a category';
  } else if (step === 2) {
    if (!form.discountValue.trim() || isNaN(Number(form.discountValue)))
      errors.discountValue = 'Enter a valid discount';
    if (form.discountType === 'percentage') {
      const val = Number(form.discountValue);
      if (val < 1 || val > 100) errors.discountValue = 'Must be 1-100%';
    }
    if (!form.originalPrice.trim() || isNaN(Number(form.originalPrice)))
      errors.originalPrice = 'Enter original price';
    if (!form.discountedPrice.trim() || isNaN(Number(form.discountedPrice)))
      errors.discountedPrice = 'Enter discounted price';
    if (
      Number(form.discountedPrice) >= Number(form.originalPrice) &&
      form.originalPrice &&
      form.discountedPrice
    )
      errors.discountedPrice = 'Must be less than original';
  } else if (step === 3) {
    if (!form.maxClaims.trim() || isNaN(Number(form.maxClaims)) || Number(form.maxClaims) < 1)
      errors.maxClaims = 'Enter a valid number';
    if (!form.expiresAt.trim()) errors.expiresAt = 'Expiry date is required';
    else if (new Date(form.expiresAt) <= new Date()) errors.expiresAt = 'Must be in the future';
  } else if (step === 4) {
    if (!form.address.trim()) errors.address = 'Address is required';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Category picker
// ---------------------------------------------------------------------------

function CategoryPicker({
  selected,
  onSelect,
  error,
}: {
  selected: string;
  onSelect: (cat: string) => void;
  error?: string;
}) {
  return (
    <View className="w-full">
      <Text className="text-[#8a8a8f] text-sm mb-1.5 font-medium">Category</Text>
      <View className="flex-row flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const isSelected = cat === selected;
          return (
            <Pressable
              key={cat}
              onPress={() => onSelect(cat)}
              className={[
                'px-3 py-2 rounded-lg border',
                isSelected
                  ? 'bg-[#c8e000]/20 border-[#c8e000]'
                  : 'bg-[#1a1a1f] border-[#2a2a30]',
              ].join(' ')}
            >
              <Text
                className={[
                  'text-sm font-medium',
                  isSelected ? 'text-[#c8e000]' : 'text-[#8a8a8f]',
                ].join(' ')}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="text-[#ef4444] text-xs mt-1">{error}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function StepBasicInfo({
  form,
  onChange,
  errors,
}: {
  form: DealFormData;
  onChange: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <View className="gap-4">
      <Text className="text-white text-lg font-semibold">Basic Information</Text>
      <Input
        label="Deal Title"
        placeholder="e.g. 50% off Monday brunch"
        value={form.title}
        onChangeText={(v) => onChange({ title: v })}
        error={errors.title}
      />
      <Input
        label="Description"
        placeholder="Describe your deal..."
        value={form.description}
        onChangeText={(v) => onChange({ description: v })}
        error={errors.description}
        multiline
        numberOfLines={4}
      />
      <CategoryPicker
        selected={form.category}
        onSelect={(cat) => onChange({ category: cat })}
        error={errors.category}
      />
    </View>
  );
}

function StepPricing({
  form,
  onChange,
  errors,
}: {
  form: DealFormData;
  onChange: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <View className="gap-4">
      <Text className="text-white text-lg font-semibold">Pricing</Text>

      <View>
        <Text className="text-[#8a8a8f] text-sm mb-1.5 font-medium">Discount Type</Text>
        <View className="flex-row gap-3">
          {(['percentage', 'fixed'] as DiscountType[]).map((type) => {
            const isSelected = form.discountType === type;
            return (
              <Pressable
                key={type}
                onPress={() => onChange({ discountType: type })}
                className={[
                  'flex-1 py-3 rounded-lg border items-center',
                  isSelected
                    ? 'bg-[#c8e000]/20 border-[#c8e000]'
                    : 'bg-[#1a1a1f] border-[#2a2a30]',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-sm font-semibold',
                    isSelected ? 'text-[#c8e000]' : 'text-[#8a8a8f]',
                  ].join(' ')}
                >
                  {type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        label={form.discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount (RON)'}
        placeholder={form.discountType === 'percentage' ? 'e.g. 25' : 'e.g. 20'}
        value={form.discountValue}
        onChangeText={(v) => onChange({ discountValue: v })}
        keyboardType="numeric"
        error={errors.discountValue}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Original Price (RON)"
            placeholder="e.g. 80"
            value={form.originalPrice}
            onChangeText={(v) => onChange({ originalPrice: v })}
            keyboardType="numeric"
            error={errors.originalPrice}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Discounted Price (RON)"
            placeholder="e.g. 40"
            value={form.discountedPrice}
            onChangeText={(v) => onChange({ discountedPrice: v })}
            keyboardType="numeric"
            error={errors.discountedPrice}
          />
        </View>
      </View>
    </View>
  );
}

function StepTerms({
  form,
  onChange,
  errors,
}: {
  form: DealFormData;
  onChange: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <View className="gap-4">
      <Text className="text-white text-lg font-semibold">Terms & Limits</Text>
      <Input
        label="Maximum Claims"
        placeholder="e.g. 50"
        value={form.maxClaims}
        onChangeText={(v) => onChange({ maxClaims: v })}
        keyboardType="numeric"
        error={errors.maxClaims}
      />
      <Input
        label="Expiry Date"
        placeholder="YYYY-MM-DD e.g. 2026-03-15"
        value={form.expiresAt}
        onChangeText={(v) => onChange({ expiresAt: v })}
        error={errors.expiresAt}
      />
      <Input
        label="Terms & Conditions (optional)"
        placeholder="Any restrictions or conditions..."
        value={form.terms}
        onChangeText={(v) => onChange({ terms: v })}
        multiline
        numberOfLines={3}
      />
      <View className="flex-row items-center justify-between bg-[#1a1a1f] rounded-lg border border-[#2a2a30] p-4">
        <View className="flex-1 mr-3">
          <Text className="text-white text-sm font-semibold">Flash Deal</Text>
          <Text className="text-[#8a8a8f] text-xs mt-1">
            Flash deals get boosted visibility and expire within 24 hours
          </Text>
        </View>
        <Switch
          value={form.isFlash}
          onValueChange={(v) => onChange({ isFlash: v })}
          trackColor={{ false: '#2a2a30', true: '#c8e000' }}
          thumbColor="#ffffff"
        />
      </View>
    </View>
  );
}

function StepLocation({
  form,
  onChange,
  errors,
}: {
  form: DealFormData;
  onChange: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <View className="gap-4">
      <Text className="text-white text-lg font-semibold">Location</Text>
      <Input
        label="Address"
        placeholder="e.g. Str. Victoriei 25, Sector 1"
        value={form.address}
        onChangeText={(v) => onChange({ address: v })}
        error={errors.address}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="City"
            placeholder="e.g. Bucharest"
            value={form.city}
            onChangeText={(v) => onChange({ city: v })}
          />
        </View>
        <View className="flex-1">
          <Input
            label="District / Sector"
            placeholder="e.g. Sector 1"
            value={form.district}
            onChangeText={(v) => onChange({ district: v })}
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Latitude (optional)"
            placeholder="e.g. 44.4268"
            value={form.latitude}
            onChangeText={(v) => onChange({ latitude: v })}
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <Input
            label="Longitude (optional)"
            placeholder="e.g. 26.1025"
            value={form.longitude}
            onChangeText={(v) => onChange({ longitude: v })}
            keyboardType="numeric"
          />
        </View>
      </View>
      <Card>
        <Text className="text-[#8a8a8f] text-xs">
          Tip: If you leave lat/lng empty, we will geocode the address automatically.
        </Text>
      </Card>
    </View>
  );
}

function StepPreview({ form }: { form: DealFormData }) {
  const discount =
    form.discountType === 'percentage'
      ? `${form.discountValue}% off`
      : `${form.discountValue} RON off`;

  return (
    <View className="gap-4">
      <Text className="text-white text-lg font-semibold">Review Your Deal</Text>

      <Card>
        <View className="flex-row items-start justify-between mb-3">
          <Text className="text-white text-base font-semibold flex-1 mr-2">
            {form.title || 'Untitled Deal'}
          </Text>
          {form.isFlash ? <Badge label="Flash" variant="warning" /> : null}
        </View>

        <Badge label={form.category || 'No Category'} variant="neutral" />

        <Text className="text-[#8a8a8f] text-sm mt-3 leading-5">
          {form.description || 'No description'}
        </Text>

        <View className="h-px bg-[#2a2a30] my-4" />

        <View className="gap-3">
          <DetailRow label="Discount" value={discount} />
          <DetailRow label="Original Price" value={`${form.originalPrice} RON`} />
          <DetailRow label="Discounted Price" value={`${form.discountedPrice} RON`} accent />
          <DetailRow label="Max Claims" value={form.maxClaims || '-'} />
          <DetailRow label="Expires" value={form.expiresAt || '-'} />
          <DetailRow label="Address" value={form.address || '-'} />
          <DetailRow label="City" value={form.city || '-'} />
          {form.district ? <DetailRow label="District" value={form.district} /> : null}
          {form.terms ? <DetailRow label="Terms" value={form.terms} /> : null}
        </View>
      </Card>
    </View>
  );
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View className="flex-row items-start justify-between">
      <Text className="text-[#8a8a8f] text-xs font-medium uppercase tracking-wide">
        {label}
      </Text>
      <Text
        className={[
          'text-sm font-semibold text-right flex-1 ml-4',
          accent ? 'text-[#c8e000]' : 'text-white',
        ].join(' ')}
      >
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------

function SuccessScreen() {
  return (
    <View className="flex-1 bg-[#0c0c0f] items-center justify-center px-8">
      <View className="w-20 h-20 rounded-full bg-[#22c55e] items-center justify-center mb-6">
        <Text style={{ fontSize: 36, color: '#ffffff' }}>{'✓'}</Text>
      </View>
      <Text className="text-white text-xl font-bold text-center mb-2">
        Deal Created!
      </Text>
      <Text className="text-[#8a8a8f] text-sm text-center leading-5 mb-8">
        Your deal is now live. Customers in your area will start seeing it right away.
      </Text>
      <Button
        variant="primary"
        size="lg"
        title="View My Deals"
        onPress={() => router.replace('/(business)/deals')}
        fullWidth
      />
      <View className="mt-3 w-full">
        <Button
          variant="ghost"
          size="md"
          title="Create Another"
          onPress={() => router.replace('/(business)/deals/create')}
          fullWidth
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CreateDealScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<DealFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateForm = useCallback((updates: Partial<DealFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(updates)) {
        delete next[key];
      }
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEP_COUNT));
  }, [step, form]);

  const goBack = useCallback(() => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const dealData = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        originalPrice: Number(form.originalPrice),
        discountedPrice: Number(form.discountedPrice),
        maxClaims: Number(form.maxClaims),
        terms: form.terms.trim() || undefined,
        isFlash: form.isFlash,
        expiresAt: new Date(form.expiresAt).toISOString(),
        address: form.address.trim(),
        city: form.city.trim() || 'Bucharest',
        district: form.district.trim() || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      };
      await api.post('/api/deals', dealData);
      setSuccess(true);
    } catch {
      setErrors({ submit: 'Failed to create deal. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  if (success) {
    return <SuccessScreen />;
  }

  const isLastStep = step === STEP_COUNT;

  return (
    <View className="flex-1 bg-[#0c0c0f]">
      <Header title="New Deal" showBack />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step indicator */}
          <View className="mb-6">
            <StepIndicator steps={STEP_COUNT} currentStep={step} labels={STEP_LABELS} />
          </View>

          {/* Step content */}
          {step === 1 && (
            <StepBasicInfo form={form} onChange={updateForm} errors={errors} />
          )}
          {step === 2 && (
            <StepPricing form={form} onChange={updateForm} errors={errors} />
          )}
          {step === 3 && (
            <StepTerms form={form} onChange={updateForm} errors={errors} />
          )}
          {step === 4 && (
            <StepLocation form={form} onChange={updateForm} errors={errors} />
          )}
          {step === 5 && <StepPreview form={form} />}

          {/* Submit error */}
          {errors.submit ? (
            <Card className="mt-4">
              <Text className="text-[#ef4444] text-sm text-center">{errors.submit}</Text>
            </Card>
          ) : null}
        </ScrollView>

        {/* Bottom buttons */}
        <View className="absolute bottom-0 left-0 right-0 bg-[#0c0c0f] border-t border-[#2a2a30] px-4 pt-3 pb-8">
          <View className="flex-row gap-3">
            {step > 1 && (
              <View className="flex-1">
                <Button
                  variant="secondary"
                  size="lg"
                  title="Back"
                  onPress={goBack}
                  fullWidth
                  disabled={submitting}
                />
              </View>
            )}
            <View className="flex-1">
              {isLastStep ? (
                <Button
                  variant="primary"
                  size="lg"
                  title="Create Deal"
                  onPress={handleSubmit}
                  loading={submitting}
                  fullWidth
                />
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  title="Continue"
                  onPress={goNext}
                  fullWidth
                />
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
