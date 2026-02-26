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
const Feather = require('@expo/vector-icons/Feather').default;
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Header from '@/components/nav/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

type DiscountType = 'percentage' | 'fixed';

interface DealFormData {
  title: string;
  description: string;
  category: string;
  discountType: DiscountType;
  discountValue: string;
  originalPrice: string;
  discountedPrice: string;
  maxClaims: string;
  terms: string;
  isFlash: boolean;
  expiresAt: string;
  address: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
}

const INITIAL_FORM: DealFormData = { title: '', description: '', category: '', discountType: 'percentage', discountValue: '', originalPrice: '', discountedPrice: '', maxClaims: '', terms: '', isFlash: false, expiresAt: '', address: '', city: 'Bucharest', district: '', latitude: '', longitude: '' };
const CATEGORIES = ['Restaurant', 'Cafe', 'Beauty', 'Fitness', 'Retail', 'Entertainment', 'Services', 'Other'];
const STEP_COUNT = 5;

function validateStep(step: number, form: DealFormData, t: (k: string, f: string) => string): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 1) {
    if (!form.title.trim()) e.title = t('deals.validation.titleRequired', 'Title is required');
    if (!form.description.trim()) e.description = t('deals.validation.descriptionRequired', 'Description is required');
    if (!form.category) e.category = t('deals.validation.selectCategory', 'Select a category');
  } else if (step === 2) {
    if (!form.discountValue.trim() || isNaN(Number(form.discountValue))) e.discountValue = t('deals.validation.validDiscount', 'Enter a valid discount');
    if (form.discountType === 'percentage') { const v = Number(form.discountValue); if (v < 1 || v > 100) e.discountValue = t('deals.validation.discountRange', 'Must be 1-100%'); }
    if (!form.originalPrice.trim() || isNaN(Number(form.originalPrice))) e.originalPrice = t('deals.validation.enterOriginalPrice', 'Enter original price');
    if (!form.discountedPrice.trim() || isNaN(Number(form.discountedPrice))) e.discountedPrice = t('deals.validation.enterDiscountedPrice', 'Enter discounted price');
    if (Number(form.discountedPrice) >= Number(form.originalPrice) && form.originalPrice && form.discountedPrice) e.discountedPrice = t('deals.validation.mustBeLess', 'Must be less than original');
  } else if (step === 3) {
    if (!form.maxClaims.trim() || isNaN(Number(form.maxClaims)) || Number(form.maxClaims) < 1) e.maxClaims = t('deals.validation.validNumber', 'Enter a valid number');
    if (!form.expiresAt.trim()) e.expiresAt = t('deals.validation.expiryRequired', 'Expiry date is required');
    else if (new Date(form.expiresAt) <= new Date()) e.expiresAt = t('deals.validation.expiryFuture', 'Must be in the future');
  } else if (step === 4) {
    if (!form.address.trim()) e.address = t('deals.validation.addressRequired', 'Address is required');
  }
  return e;
}

function CategoryPicker({ selected, onSelect, error }: { selected: string; onSelect: (c: string) => void; error?: string }) {
  const { t } = useTranslation();
  return (<View className="w-full"><Text className="text-text-secondary text-sm mb-1.5 font-medium">{t('deals.create.category', 'Category')}</Text><View className="flex-row flex-wrap gap-2">{CATEGORIES.map((cat) => { const s = cat === selected; return (<Pressable key={cat} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(cat); }} className={['px-3 py-2 rounded-lg border', s ? 'bg-accent/20 border-accent' : 'bg-surface border-border'].join(' ')}><Text className={['text-sm font-medium', s ? 'text-accent' : 'text-text-secondary'].join(' ')}>{cat}</Text></Pressable>); })}</View>{error ? <Text className="text-error text-xs mt-1">{error}</Text> : null}</View>);
}

function StepBasicInfo({ form, onChange, errors }: { form: DealFormData; onChange: (u: Partial<DealFormData>) => void; errors: Record<string, string> }) {
  const { t } = useTranslation();
  return (<View className="gap-4"><Text className="text-white text-lg font-semibold">{t('deals.create.basicInfo', 'Basic Information')}</Text><Input label={t('deals.create.dealTitle', 'Deal title')} placeholder={t('deals.create.dealTitlePlaceholder', 'e.g. 50% off Monday brunch')} value={form.title} onChangeText={(v) => onChange({ title: v })} error={errors.title} autoFocus /><Input label={t('deals.create.description', 'Description')} placeholder={t('deals.create.descriptionPlaceholder', 'Describe your deal...')} value={form.description} onChangeText={(v) => onChange({ description: v })} error={errors.description} multiline numberOfLines={4} /><CategoryPicker selected={form.category} onSelect={(c) => onChange({ category: c })} error={errors.category} /></View>);
}

function StepPricing({ form, onChange, errors }: { form: DealFormData; onChange: (u: Partial<DealFormData>) => void; errors: Record<string, string> }) {
  const { t } = useTranslation();
  return (<View className="gap-4"><Text className="text-white text-lg font-semibold">{t('deals.create.pricing', 'Pricing')}</Text><View><Text className="text-text-secondary text-sm mb-1.5 font-medium">{t('deals.create.discountType', 'Discount Type')}</Text><View className="flex-row gap-3">{(['percentage', 'fixed'] as DiscountType[]).map((type) => { const s = form.discountType === type; return (<Pressable key={type} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange({ discountType: type }); }} className={['flex-1 py-3 rounded-lg border items-center', s ? 'bg-accent/20 border-accent' : 'bg-surface border-border'].join(' ')}><Text className={['text-sm font-semibold', s ? 'text-accent' : 'text-text-secondary'].join(' ')}>{type === 'percentage' ? t('deals.create.percentage', 'Percentage (%)') : t('deals.create.fixedAmount', 'Fixed Amount')}</Text></Pressable>); })}</View></View><Input label={form.discountType === 'percentage' ? t('deals.create.discountPercent', 'Discount (%)') : t('deals.create.discountAmount', 'Discount Amount (RON)')} placeholder={form.discountType === 'percentage' ? t('deals.create.discountPercentPlaceholder', 'e.g. 25') : t('deals.create.discountAmountPlaceholder', 'e.g. 20')} value={form.discountValue} onChangeText={(v) => onChange({ discountValue: v })} keyboardType="numeric" error={errors.discountValue} /><View className="flex-row gap-3"><View className="flex-1"><Input label={t('deals.create.originalPriceLabel', 'Original Price (RON)')} placeholder={t('deals.create.originalPricePlaceholder', 'e.g. 80')} value={form.originalPrice} onChangeText={(v) => onChange({ originalPrice: v })} keyboardType="numeric" error={errors.originalPrice} /></View><View className="flex-1"><Input label={t('deals.create.discountedPriceLabel', 'Discounted Price (RON)')} placeholder={t('deals.create.discountedPricePlaceholder', 'e.g. 40')} value={form.discountedPrice} onChangeText={(v) => onChange({ discountedPrice: v })} keyboardType="numeric" error={errors.discountedPrice} /></View></View></View>);
}

function StepTerms({ form, onChange, errors }: { form: DealFormData; onChange: (u: Partial<DealFormData>) => void; errors: Record<string, string> }) {
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const parsedDate = form.expiresAt ? new Date(form.expiresAt) : new Date();
  const isValidDate = form.expiresAt && !isNaN(parsedDate.getTime());
  return (<View className="gap-4"><Text className="text-white text-lg font-semibold">{t('deals.create.termsAndLimits', 'Terms & Limits')}</Text><Input label={t('deals.create.maximumClaims', 'Maximum Claims')} placeholder={t('deals.create.maximumClaimsPlaceholder', 'e.g. 50')} value={form.maxClaims} onChangeText={(v) => onChange({ maxClaims: v })} keyboardType="numeric" error={errors.maxClaims} /><View className="w-full"><Text className="text-text-secondary text-sm mb-1.5 font-medium">{t('deals.create.expiryDate', 'Expiry Date')}</Text><Pressable onPress={() => { Keyboard.dismiss(); setShowDatePicker((p) => !p); }} className={['flex-row items-center bg-surface rounded-lg border h-12 px-3', errors.expiresAt ? 'border-error' : showDatePicker ? 'border-accent' : 'border-border'].join(' ')}><Text className={isValidDate ? 'text-white text-base' : 'text-text-secondary text-base'}>{isValidDate ? parsedDate.toLocaleDateString('en-CA') : t('deals.create.selectExpiryDate', 'Select expiry date')}</Text></Pressable>{errors.expiresAt ? <Text className="text-error text-xs mt-1">{errors.expiresAt}</Text> : null}{showDatePicker && (<View className="mt-2 bg-surface rounded-lg border border-border overflow-hidden"><DateTimePicker value={isValidDate ? parsedDate : new Date()} mode="date" display="spinner" minimumDate={new Date()} themeVariant="dark" onChange={(_e, d) => { if (d) onChange({ expiresAt: d.toISOString().split('T')[0] }); }} /></View>)}</View><Input label={t('deals.create.termsOptional', 'Terms & Conditions (optional)')} placeholder={t('deals.create.termsPlaceholder', 'Any restrictions or conditions...')} value={form.terms} onChangeText={(v) => onChange({ terms: v })} multiline numberOfLines={3} /><View className="flex-row items-center justify-between bg-surface rounded-lg border border-border p-4"><View className="flex-1 mr-3"><Text className="text-white text-sm font-semibold">{t('deals.create.flashDealLabel', 'Flash Deal')}</Text><Text className="text-text-secondary text-xs mt-1">{t('deals.create.flashDealDesc', 'Flash deals get boosted visibility and expire within 24 hours')}</Text></View><Switch value={form.isFlash} onValueChange={(v) => onChange({ isFlash: v })} trackColor={{ false: '#2a2a30', true: '#c8e000' }} thumbColor="#ffffff" /></View></View>);
}

const BUCHAREST_REGION: Region = { latitude: 44.4268, longitude: 26.1025, latitudeDelta: 0.01, longitudeDelta: 0.01 };

function StepLocation({ form, onChange, errors }: { form: DealFormData; onChange: (u: Partial<DealFormData>) => void; errors: Record<string, string> }) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<Location.LocationGeocodedAddress[]>([]);
  const [suggestionLabels, setSuggestionLabels] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapCoord, setMapCoord] = useState<{ latitude: number; longitude: number } | null>(form.latitude && form.longitude ? { latitude: Number(form.latitude), longitude: Number(form.longitude) } : null);
  const [showMap, setShowMap] = useState(!!mapCoord);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);

  const geocodeAddress = useCallback(async (text: string) => {
    if (text.length < 4) { setSuggestionLabels([]); setShowSuggestions(false); return; }
    setGeocoding(true);
    try {
      const query = text.includes('Bucharest') ? text : `${text}, Bucharest, Romania`;
      const results = await Location.geocodeAsync(query);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setMapCoord({ latitude, longitude }); setShowMap(true);
        onChange({ latitude: String(latitude), longitude: String(longitude) });
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (rev.length > 0) {
          const labels = rev.slice(0, 3).map((r) => { const p = [r.street, r.streetNumber, r.district, r.city].filter(Boolean); return p.join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`; });
          setSuggestionLabels(labels); setSuggestions(rev.slice(0, 3)); setShowSuggestions(true);
        }
        mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
      }
    } catch { /* silent */ } finally { setGeocoding(false); }
  }, [onChange]);

  const handleAddressChange = useCallback((text: string) => { onChange({ address: text }); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => geocodeAddress(text), 1200); }, [onChange, geocodeAddress]);
  const selectSuggestion = useCallback((label: string, idx: number) => { onChange({ address: label }); setShowSuggestions(false); Keyboard.dismiss(); const r = suggestions[idx]; if (r) { if (r.city) onChange({ city: r.city }); if (r.district) onChange({ district: r.district }); } }, [onChange, suggestions]);
  const handleMarkerDragEnd = useCallback(async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMapCoord({ latitude, longitude }); onChange({ latitude: String(latitude), longitude: String(longitude) });
    try { const res = await Location.reverseGeocodeAsync({ latitude, longitude }); if (res.length > 0) { const r = res[0]; const p = [r.street, r.streetNumber, r.district, r.city].filter(Boolean); onChange({ address: p.join(', ') || form.address, city: r.city || form.city, district: r.district || form.district }); } } catch { /* silent */ }
  }, [onChange, form.address, form.city, form.district]);

  return (<View className="gap-4"><Text className="text-white text-lg font-semibold">{t('deals.create.locationTitle', 'Location')}</Text><View className="w-full"><Input label={t('deals.create.addressLabel', 'Address')} placeholder={t('deals.create.addressPlaceholder', 'Start typing an address...')} value={form.address} onChangeText={handleAddressChange} error={errors.address} />{geocoding && (<View className="flex-row items-center mt-1.5"><ActivityIndicator size="small" color="#c8e000" /><Text className="text-text-secondary text-xs ml-2">{t('deals.create.findingLocation', 'Finding location...')}</Text></View>)}{showSuggestions && suggestionLabels.length > 0 && (<View className="mt-1 bg-surface rounded-lg border border-border overflow-hidden">{suggestionLabels.map((label, idx) => (<Pressable key={idx} onPress={() => selectSuggestion(label, idx)} className="px-3 py-3 border-b border-border" style={idx === suggestionLabels.length - 1 ? { borderBottomWidth: 0 } : undefined}><Text className="text-white text-sm" numberOfLines={2}>{label}</Text></Pressable>))}</View>)}</View><View className="flex-row gap-3"><View className="flex-1"><Input label={t('deals.create.cityLabel', 'City')} placeholder={t('deals.create.cityPlaceholder', 'e.g. Bucharest')} value={form.city} onChangeText={(v) => onChange({ city: v })} /></View><View className="flex-1"><Input label={t('deals.create.districtLabel', 'District / Sector')} placeholder={t('deals.create.districtPlaceholder', 'e.g. Sector 1')} value={form.district} onChangeText={(v) => onChange({ district: v })} /></View></View>{showMap && mapCoord && (<View className="w-full rounded-lg overflow-hidden border border-border" style={{ height: 330 }} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}><MapView ref={mapRef} style={{ flex: 1 }} initialRegion={{ ...mapCoord, latitudeDelta: 0.005, longitudeDelta: 0.005 }} userInterfaceStyle="dark" zoomEnabled scrollEnabled pitchEnabled={false} rotateEnabled={false}><Marker coordinate={mapCoord} draggable onDragEnd={handleMarkerDragEnd}><View style={{ alignItems: 'center' }}><View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#c8e000', borderWidth: 3, borderColor: '#000', shadowColor: '#c8e000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 5 }} /><View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#c8e000', marginTop: -1 }} /></View></Marker></MapView><View className="absolute bottom-2 left-2 right-2 bg-bg/80 rounded-md px-3 py-1.5"><Text className="text-text-secondary text-xs text-center">{t('deals.create.dragPinAdjust', 'Drag the pin to adjust the exact location')}</Text></View></View>)}</View>);
}

function PreviewSection({ title, stepNumber, onEdit, editLabel, children }: { title: string; stepNumber: number; onEdit: (s: number) => void; editLabel: string; children: React.ReactNode }) {
  return (<Pressable onPress={() => onEdit(stepNumber)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}><View className="flex-row items-center justify-between mb-2"><Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">{title}</Text><Text className="text-accent text-xs font-medium">{editLabel} ›</Text></View>{children}</Pressable>);
}

function StepPreview({ form, onEditStep }: { form: DealFormData; onEditStep: (s: number) => void }) {
  const { t } = useTranslation();
  const discount = form.discountType === 'percentage' ? `${form.discountValue}%` : `${form.discountValue} RON`;
  const editLabel = t('deals.create.editStep', 'Edit');
  return (<View className="gap-5"><Pressable onPress={() => onEditStep(1)} className="bg-surface rounded-2xl border border-border px-6 pt-6 pb-5" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}><View className="flex-row items-center justify-between"><View className="flex-row items-center gap-2"><Badge label={form.category || t('deals.create.noCategory', 'No Category')} variant="neutral" />{form.isFlash ? <Badge label={t('deals.create.flash', 'Flash')} variant="warning" /> : null}</View><Text className="text-accent text-base font-medium">{editLabel} ›</Text></View><Text className="text-white text-2xl font-bold mt-4">{form.title || t('deals.create.untitledDeal', 'Untitled Deal')}</Text><Text className="text-text-secondary text-base mt-2 leading-6" numberOfLines={2}>{form.description || t('deals.create.noDescription', 'No description')}</Text></Pressable><PreviewSection title={t('deals.create.pricing', 'Pricing')} stepNumber={2} onEdit={onEditStep} editLabel={editLabel}><View className="flex-row bg-surface rounded-2xl border border-border overflow-hidden"><View className="flex-1 py-5 items-center"><Text className="text-text-secondary text-sm">{t('deals.create.original', 'Original')}</Text><Text className="text-white text-lg font-semibold line-through mt-1.5">{form.originalPrice} RON</Text></View><View className="w-px bg-border" /><View className="flex-1 py-5 items-center"><Text className="text-text-secondary text-sm">{t('deals.create.now', 'Now')}</Text><Text className="text-accent text-xl font-bold mt-1.5">{form.discountedPrice} RON</Text></View><View className="w-px bg-border" /><View className="flex-1 py-5 items-center"><Text className="text-text-secondary text-sm">{t('deals.create.save', 'Save')}</Text><Text className="text-success text-lg font-bold mt-1.5">{discount}</Text></View></View></PreviewSection><PreviewSection title={t('deals.create.stepTerms', 'Terms')} stepNumber={3} onEdit={onEditStep} editLabel={editLabel}><View className="flex-row bg-surface rounded-2xl border border-border overflow-hidden"><View className="flex-1 py-5 items-center"><Text className="text-text-secondary text-sm">{t('deals.create.claims', 'Claims')}</Text><Text className="text-white text-xl font-bold mt-1.5">{form.maxClaims || '-'}</Text></View><View className="w-px bg-border" /><View className="flex-1 py-5 items-center"><Text className="text-text-secondary text-sm">{t('deals.create.expires', 'Expires')}</Text><Text className="text-white text-lg font-bold mt-1.5">{form.expiresAt || '-'}</Text></View>{form.terms ? (<><View className="w-px bg-border" /><View className="flex-1 py-5 items-center px-3"><Text className="text-text-secondary text-sm">{t('deals.create.termsConditions', 'T&C')}</Text><Text className="text-white text-base mt-1.5 text-center" numberOfLines={1}>{form.terms}</Text></View></>) : null}</View></PreviewSection><PreviewSection title={t('deals.create.locationTitle', 'Location')} stepNumber={4} onEdit={onEditStep} editLabel={editLabel}><View className="bg-surface rounded-2xl border border-border px-6 py-5"><Text className="text-white text-lg" numberOfLines={1}>{form.address || '-'}</Text><Text className="text-text-secondary text-base mt-1.5">{[form.district, form.city].filter(Boolean).join(', ') || '-'}</Text></View></PreviewSection></View>);
}

function SuccessScreen() {
  const { t } = useTranslation();
  return (<View className="flex-1 bg-bg items-center justify-center px-8"><View className="w-20 h-20 rounded-full bg-success items-center justify-center mb-6"><Text style={{ fontSize: 36, color: '#ffffff' }}>{'✓'}</Text></View><Text className="text-white text-xl font-bold text-center mb-2">{t('deals.create.dealCreated', 'Deal Created!')}</Text><Text className="text-text-secondary text-sm text-center leading-5 mb-8">{t('deals.create.dealCreatedMessage', 'Your deal is now live. Customers in your area will start seeing it right away.')}</Text><Button variant="primary" size="lg" title={t('deals.create.viewMyDeals', 'View My Deals')} onPress={() => router.replace('/(business)/deals')} fullWidth /><View className="mt-3 w-full"><Button variant="ghost" size="md" title={t('deals.create.createAnother', 'Create Another')} onPress={() => router.replace('/(business)/deals/create')} fullWidth /></View></View>);
}

export default function CreateDealScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<DealFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const STEP_LABELS = [t('deals.create.stepBasic', 'Basic'), t('deals.create.stepPricing', 'Pricing'), t('deals.create.stepTerms', 'Terms'), t('deals.create.stepLocation', 'Location'), t('deals.create.stepPreview', 'Preview')];

  const updateForm = useCallback((updates: Partial<DealFormData>) => { setForm((prev) => ({ ...prev, ...updates })); setErrors((prev) => { const next = { ...prev }; for (const key of Object.keys(updates)) delete next[key]; return next; }); }, []);
  const goNext = useCallback(() => { const se = validateStep(step, form, t); if (Object.keys(se).length > 0) { setErrors(se); return; } setErrors({}); setStep((s) => Math.min(s + 1, STEP_COUNT)); }, [step, form, t]);
  const goBack = useCallback(() => { setErrors({}); setStep((s) => Math.max(s - 1, 1)); }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const dealData: Record<string, unknown> = { title: form.title.trim(), description: form.description.trim(), category: form.category, originalPrice: Number(form.originalPrice), dealPrice: Number(form.discountedPrice), maxClaims: Number(form.maxClaims), expiresAt: new Date(form.expiresAt).toISOString(), latitude: form.latitude ? Number(form.latitude) : 44.4268, longitude: form.longitude ? Number(form.longitude) : 26.1025, district: form.district.trim() || 'Sector 1', city: form.city.trim() || 'Bucharest', address: form.address.trim() || undefined, discountType: form.discountType, discountValue: Number(form.discountValue), terms: form.terms.trim() || undefined, isFlash: form.isFlash };
      console.log('Submitting deal:', JSON.stringify(dealData));
      await api.post('/api/deals', dealData);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('deals.validation.failedToCreate', 'Failed to create deal. Please try again.');
      console.error('Create deal error:', err);
      Alert.alert(t('common.error', 'Error'), msg);
      setErrors({ submit: msg });
    } finally { setSubmitting(false); }
  }, [form, t]);

  if (success) return <SuccessScreen />;
  const isLastStep = step === STEP_COUNT;

  return (<View className="flex-1 bg-bg"><Header title={t('deals.create.title', 'New Deal')} showBack /><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}><ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View className="mb-6"><StepIndicator steps={STEP_COUNT} currentStep={step} labels={STEP_LABELS} /></View>{step === 1 && <StepBasicInfo form={form} onChange={updateForm} errors={errors} />}{step === 2 && <StepPricing form={form} onChange={updateForm} errors={errors} />}{step === 3 && <StepTerms form={form} onChange={updateForm} errors={errors} />}{step === 4 && <StepLocation form={form} onChange={updateForm} errors={errors} />}{step === 5 && <StepPreview form={form} onEditStep={(s) => { setErrors({}); setStep(s); }} />}{errors.submit ? (<Card className="mt-4"><Text className="text-error text-sm text-center">{errors.submit}</Text></Card>) : null}</ScrollView><View className="absolute bottom-0 left-0 right-0 bg-bg border-t border-border px-4 pt-3 pb-8"><View className="flex-row gap-3">{step > 1 && (<View className="flex-1"><Button variant="secondary" size="lg" title={t('common.back', 'Back')} onPress={goBack} fullWidth disabled={submitting} /></View>)}<View className="flex-1">{isLastStep ? (<Button variant="primary" size="lg" title={t('deals.create.createDealButton', 'Create Deal')} onPress={handleSubmit} loading={submitting} fullWidth />) : (<Button variant="primary" size="lg" title={t('common.continue', 'Continue')} onPress={goNext} fullWidth rightIcon={<Feather name="arrow-right" size={20} color="#0c0c0f" />} />)}</View></View></View></KeyboardAvoidingView></View>);
}
