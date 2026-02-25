import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  const parsedDate = form.expiresAt ? new Date(form.expiresAt) : new Date();
  const isValidDate = form.expiresAt && !isNaN(parsedDate.getTime());

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

      {/* Expiry Date — tap to show picker */}
      <View className="w-full">
        <Text className="text-[#8a8a8f] text-sm mb-1.5 font-medium">Expiry Date</Text>
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            setShowDatePicker((prev) => !prev);
          }}
          className={[
            'flex-row items-center bg-[#1a1a1f] rounded-lg border h-12 px-3',
            errors.expiresAt ? 'border-[#ef4444]' : showDatePicker ? 'border-[#c8e000]' : 'border-[#2a2a30]',
          ].join(' ')}
        >
          <Text className={isValidDate ? 'text-white text-base' : 'text-[#8a8a8f] text-base'}>
            {isValidDate
              ? parsedDate.toLocaleDateString('en-CA') // YYYY-MM-DD format
              : 'Select expiry date'}
          </Text>
        </Pressable>
        {errors.expiresAt ? (
          <Text className="text-[#ef4444] text-xs mt-1">{errors.expiresAt}</Text>
        ) : null}

        {showDatePicker && (
          <View className="mt-2 bg-[#1a1a1f] rounded-lg border border-[#2a2a30] overflow-hidden">
            <DateTimePicker
              value={isValidDate ? parsedDate : new Date()}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              themeVariant="dark"
              onChange={(_event, selectedDate) => {
                if (selectedDate) {
                  onChange({ expiresAt: selectedDate.toISOString().split('T')[0] });
                }
              }}
            />
          </View>
        )}
      </View>

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

// Default to central Bucharest
const BUCHAREST_REGION: Region = {
  latitude: 44.4268,
  longitude: 26.1025,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

function StepLocation({
  form,
  onChange,
  errors,
}: {
  form: DealFormData;
  onChange: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}) {
  const [suggestions, setSuggestions] = useState<Location.LocationGeocodedAddress[]>([]);
  const [suggestionLabels, setSuggestionLabels] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapCoord, setMapCoord] = useState<{ latitude: number; longitude: number } | null>(
    form.latitude && form.longitude
      ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
      : null,
  );
  const [showMap, setShowMap] = useState(!!mapCoord);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);

  // Geocode address text → suggestions + map pin
  const geocodeAddress = useCallback(async (text: string) => {
    if (text.length < 4) {
      setSuggestionLabels([]);
      setShowSuggestions(false);
      return;
    }
    setGeocoding(true);
    try {
      const query = text.includes('Bucharest') ? text : `${text}, Bucharest, Romania`;
      const results = await Location.geocodeAsync(query);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setMapCoord({ latitude, longitude });
        setShowMap(true);
        onChange({ latitude: String(latitude), longitude: String(longitude) });

        // Get display addresses via reverse geocode for suggestions
        const reverseResults = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverseResults.length > 0) {
          const labels = reverseResults.slice(0, 3).map((r) => {
            const parts = [r.street, r.streetNumber, r.district, r.city].filter(Boolean);
            return parts.join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          });
          setSuggestionLabels(labels);
          setSuggestions(reverseResults.slice(0, 3));
          setShowSuggestions(true);
        }

        // Animate map to new location
        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
          500,
        );
      }
    } catch {
      // Geocoding failed silently
    } finally {
      setGeocoding(false);
    }
  }, [onChange]);

  // Debounced geocoding on address text change
  const handleAddressChange = useCallback(
    (text: string) => {
      onChange({ address: text });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => geocodeAddress(text), 1200);
    },
    [onChange, geocodeAddress],
  );

  // Select a suggestion
  const selectSuggestion = useCallback(
    (label: string, idx: number) => {
      onChange({ address: label });
      setShowSuggestions(false);
      Keyboard.dismiss();
      // Extract city/district from reverse geocode result
      const result = suggestions[idx];
      if (result) {
        if (result.city) onChange({ city: result.city });
        if (result.district) onChange({ district: result.district });
      }
    },
    [onChange, suggestions],
  );

  // Reverse geocode when pin is dragged
  const handleMarkerDragEnd = useCallback(
    async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      setMapCoord({ latitude, longitude });
      onChange({ latitude: String(latitude), longitude: String(longitude) });

      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results.length > 0) {
          const r = results[0];
          const parts = [r.street, r.streetNumber, r.district, r.city].filter(Boolean);
          const newAddress = parts.join(', ') || form.address;
          onChange({
            address: newAddress,
            city: r.city || form.city,
            district: r.district || form.district,
          });
        }
      } catch {
        // Reverse geocode failed
      }
    },
    [onChange, form.address, form.city, form.district],
  );

  return (
    <View className="gap-4">
      <Text className="text-white text-lg font-semibold">Location</Text>

      {/* Address with autocomplete */}
      <View className="w-full">
        <Input
          label="Address"
          placeholder="Start typing an address..."
          value={form.address}
          onChangeText={handleAddressChange}
          error={errors.address}
        />
        {geocoding && (
          <View className="flex-row items-center mt-1.5">
            <ActivityIndicator size="small" color="#c8e000" />
            <Text className="text-[#8a8a8f] text-xs ml-2">Finding location...</Text>
          </View>
        )}

        {/* Autocomplete suggestions */}
        {showSuggestions && suggestionLabels.length > 0 && (
          <View className="mt-1 bg-[#1a1a1f] rounded-lg border border-[#2a2a30] overflow-hidden">
            {suggestionLabels.map((label, idx) => (
              <Pressable
                key={idx}
                onPress={() => selectSuggestion(label, idx)}
                className="px-3 py-3 border-b border-[#2a2a30]"
                style={idx === suggestionLabels.length - 1 ? { borderBottomWidth: 0 } : undefined}
              >
                <Text className="text-white text-sm" numberOfLines={2}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

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

      {/* Map with draggable pin */}
      {showMap && mapCoord && (
        <View
        className="w-full rounded-lg overflow-hidden border border-[#2a2a30]"
        style={{ height: 330 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
      >
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{
              ...mapCoord,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            userInterfaceStyle="dark"
            zoomEnabled
            scrollEnabled
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={mapCoord}
              draggable
              onDragEnd={handleMarkerDragEnd}
            >
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#c8e000', borderWidth: 3, borderColor: '#000', shadowColor: '#c8e000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 5 }} />
                <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#c8e000', marginTop: -1 }} />
              </View>
            </Marker>
          </MapView>
          <View className="absolute bottom-2 left-2 right-2 bg-[#0c0c0f]/80 rounded-md px-3 py-1.5">
            <Text className="text-[#8a8a8f] text-xs text-center">
              Drag the pin to adjust the exact location
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function PreviewSection({
  title,
  stepNumber,
  onEdit,
  children,
}: {
  title: string;
  stepNumber: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => onEdit(stepNumber)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[#8a8a8f] text-xs font-semibold uppercase tracking-wider">{title}</Text>
        <Text className="text-[#c8e000] text-xs font-medium">Edit ›</Text>
      </View>
      {children}
    </Pressable>
  );
}

function StepPreview({
  form,
  onEditStep,
}: {
  form: DealFormData;
  onEditStep: (step: number) => void;
}) {
  const discount =
    form.discountType === 'percentage'
      ? `${form.discountValue}%`
      : `${form.discountValue} RON`;

  return (
    <View className="gap-5">
      {/* Deal info card */}
      <Pressable
        onPress={() => onEditStep(1)}
        className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a30] px-6 pt-6 pb-5"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Badge label={form.category || 'No Category'} variant="neutral" />
            {form.isFlash ? <Badge label="Flash" variant="warning" /> : null}
          </View>
          <Text className="text-[#c8e000] text-base font-medium">Edit ›</Text>
        </View>
        <Text className="text-white text-2xl font-bold mt-4">{form.title || 'Untitled Deal'}</Text>
        <Text className="text-[#8a8a8f] text-base mt-2 leading-6" numberOfLines={2}>{form.description || 'No description'}</Text>
      </Pressable>

      {/* Pricing row */}
      <PreviewSection title="Pricing" stepNumber={2} onEdit={onEditStep}>
        <View className="flex-row bg-[#1a1a1f] rounded-2xl border border-[#2a2a30] overflow-hidden">
          <View className="flex-1 py-5 items-center">
            <Text className="text-[#8a8a8f] text-sm">Original</Text>
            <Text className="text-white text-lg font-semibold line-through mt-1.5">{form.originalPrice} RON</Text>
          </View>
          <View className="w-px bg-[#2a2a30]" />
          <View className="flex-1 py-5 items-center">
            <Text className="text-[#8a8a8f] text-sm">Now</Text>
            <Text className="text-[#c8e000] text-xl font-bold mt-1.5">{form.discountedPrice} RON</Text>
          </View>
          <View className="w-px bg-[#2a2a30]" />
          <View className="flex-1 py-5 items-center">
            <Text className="text-[#8a8a8f] text-sm">Save</Text>
            <Text className="text-[#22c55e] text-lg font-bold mt-1.5">{discount}</Text>
          </View>
        </View>
      </PreviewSection>

      {/* Terms row */}
      <PreviewSection title="Terms" stepNumber={3} onEdit={onEditStep}>
        <View className="flex-row bg-[#1a1a1f] rounded-2xl border border-[#2a2a30] overflow-hidden">
          <View className="flex-1 py-5 items-center">
            <Text className="text-[#8a8a8f] text-sm">Claims</Text>
            <Text className="text-white text-xl font-bold mt-1.5">{form.maxClaims || '-'}</Text>
          </View>
          <View className="w-px bg-[#2a2a30]" />
          <View className="flex-1 py-5 items-center">
            <Text className="text-[#8a8a8f] text-sm">Expires</Text>
            <Text className="text-white text-lg font-bold mt-1.5">{form.expiresAt || '-'}</Text>
          </View>
          {form.terms ? (
            <>
              <View className="w-px bg-[#2a2a30]" />
              <View className="flex-1 py-5 items-center px-3">
                <Text className="text-[#8a8a8f] text-sm">T&C</Text>
                <Text className="text-white text-base mt-1.5 text-center" numberOfLines={1}>{form.terms}</Text>
              </View>
            </>
          ) : null}
        </View>
      </PreviewSection>

      {/* Location row */}
      <PreviewSection title="Location" stepNumber={4} onEdit={onEditStep}>
        <View className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a30] px-6 py-5">
          <Text className="text-white text-lg" numberOfLines={1}>{form.address || '-'}</Text>
          <Text className="text-[#8a8a8f] text-base mt-1.5">
            {[form.district, form.city].filter(Boolean).join(', ') || '-'}
          </Text>
        </View>
      </PreviewSection>
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
      const dealData: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        originalPrice: Number(form.originalPrice),
        discountedPrice: Number(form.discountedPrice),
        maxClaims: Number(form.maxClaims),
        expiresAt: new Date(form.expiresAt).toISOString(),
        latitude: form.latitude ? Number(form.latitude) : 44.4268,
        longitude: form.longitude ? Number(form.longitude) : 26.1025,
        district: form.district.trim() || 'Sector 1',
        city: form.city.trim() || 'Bucharest',
        // Optional fields
        address: form.address.trim() || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        terms: form.terms.trim() || undefined,
        isFlash: form.isFlash,
      };
      console.log('Submitting deal:', JSON.stringify(dealData));
      await api.post('/api/deals', dealData);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create deal. Please try again.';
      console.error('Create deal error:', err);
      Alert.alert('Error', msg);
      setErrors({ submit: msg });
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
          {step === 5 && <StepPreview form={form} onEditStep={(s) => { setErrors({}); setStep(s); }} />}

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
