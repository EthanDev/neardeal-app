import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScanState = 'idle' | 'processing' | 'success' | 'error';

interface RedeemResult {
  dealTitle?: string;
  discount?: string;
}

interface OfflineRedeemEntry {
  claimId: string;
  qrToken: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Offline queue helpers
// ---------------------------------------------------------------------------

const OFFLINE_QUEUE_KEY = 'neardeal_offline_redeem_queue';

async function getOfflineQueue(): Promise<OfflineRedeemEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function addToOfflineQueue(entry: OfflineRedeemEntry): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push(entry);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}

async function processOfflineQueue(): Promise<void> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return;

  const remaining: OfflineRedeemEntry[] = [];
  for (const entry of queue) {
    try {
      await api.post(`/api/claims/${entry.claimId}/redeem`, { qrToken: entry.qrToken });
    } catch {
      // Keep failed entries for next retry
      remaining.push(entry);
    }
  }

  if (remaining.length > 0) {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  } else {
    await clearOfflineQueue();
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_SIZE = SCREEN_WIDTH * 0.75; // 75% of screen width
const CORNER_LENGTH = 32;
const CORNER_THICKNESS = 4;
const ACCENT = '#c8e000';
const SUCCESS_COLOR = '#22c55e';
const ERROR_COLOR = '#ef4444';
const AUTO_RESET_MS = 5000;

// ---------------------------------------------------------------------------
// Corner bracket component
// ---------------------------------------------------------------------------

function CornerBrackets({ color = ACCENT }: { color?: string }) {
  const corner = {
    position: 'absolute' as const,
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
  };

  const h = {
    position: 'absolute' as const,
    height: CORNER_THICKNESS,
    width: CORNER_LENGTH,
    backgroundColor: color,
    borderRadius: CORNER_THICKNESS / 2,
  };

  const v = {
    position: 'absolute' as const,
    width: CORNER_THICKNESS,
    height: CORNER_LENGTH,
    backgroundColor: color,
    borderRadius: CORNER_THICKNESS / 2,
  };

  return (
    <>
      <View style={[corner, { top: 0, left: 0 }]}>
        <View style={[h, { top: 0, left: 0 }]} />
        <View style={[v, { top: 0, left: 0 }]} />
      </View>
      <View style={[corner, { top: 0, right: 0 }]}>
        <View style={[h, { top: 0, right: 0 }]} />
        <View style={[v, { top: 0, right: 0 }]} />
      </View>
      <View style={[corner, { bottom: 0, left: 0 }]}>
        <View style={[h, { bottom: 0, left: 0 }]} />
        <View style={[v, { bottom: 0, left: 0 }]} />
      </View>
      <View style={[corner, { bottom: 0, right: 0 }]}>
        <View style={[h, { bottom: 0, right: 0 }]} />
        <View style={[v, { bottom: 0, right: 0 }]} />
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Torch icon (flashlight shape built from Views)
// ---------------------------------------------------------------------------

function TorchIcon({ active }: { active: boolean }) {
  const color = active ? '#0c0c0f' : '#ffffff';
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      {/* Torch body */}
      <View style={{
        width: 10,
        height: 14,
        backgroundColor: color,
        borderRadius: 2,
        position: 'absolute',
        bottom: 0,
      }} />
      {/* Torch head (wider top) */}
      <View style={{
        width: 14,
        height: 6,
        backgroundColor: color,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        borderBottomLeftRadius: 1,
        borderBottomRightRadius: 1,
        position: 'absolute',
        top: 2,
      }} />
      {/* Light beam when active */}
      {active && (
        <>
          <View style={{
            position: 'absolute',
            top: -3,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: ACCENT,
          }} />
          <View style={{
            position: 'absolute',
            top: -2,
            left: 2,
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: ACCENT,
            opacity: 0.6,
          }} />
          <View style={{
            position: 'absolute',
            top: -2,
            right: 2,
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: ACCENT,
            opacity: 0.6,
          }} />
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Keyboard/manual entry icon (built from Views)
// ---------------------------------------------------------------------------

function KeyboardIcon() {
  return (
    <View style={{ width: 22, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer frame */}
      <View style={{
        width: 22,
        height: 16,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: '#ffffff',
        padding: 2,
        justifyContent: 'space-between',
      }}>
        {/* Row 1: 4 keys */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: 3, height: 2.5, backgroundColor: '#ffffff', borderRadius: 0.5 }} />
          <View style={{ width: 3, height: 2.5, backgroundColor: '#ffffff', borderRadius: 0.5 }} />
          <View style={{ width: 3, height: 2.5, backgroundColor: '#ffffff', borderRadius: 0.5 }} />
          <View style={{ width: 3, height: 2.5, backgroundColor: '#ffffff', borderRadius: 0.5 }} />
        </View>
        {/* Row 2: space bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <View style={{ width: 10, height: 2.5, backgroundColor: '#ffffff', borderRadius: 0.5 }} />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Checkmark icon
// ---------------------------------------------------------------------------

function CheckmarkIcon() {
  return (
    <View style={styles.iconInner}>
      <View
        style={{
          position: 'absolute',
          width: 18,
          height: 4,
          backgroundColor: '#ffffff',
          borderRadius: 2,
          transform: [{ rotate: '45deg' }, { translateX: -2 }, { translateY: 6 }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 36,
          height: 4,
          backgroundColor: '#ffffff',
          borderRadius: 2,
          transform: [{ rotate: '-55deg' }, { translateX: 8 }, { translateY: -8 }],
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// X mark icon
// ---------------------------------------------------------------------------

function XMarkIcon() {
  const bar = {
    position: 'absolute' as const,
    width: 36,
    height: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  };

  return (
    <View style={styles.iconInner}>
      <View style={[bar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[bar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Result overlay
// ---------------------------------------------------------------------------

function ResultOverlay({
  state,
  result,
  errorMessage,
  onReset,
}: {
  state: 'success' | 'error';
  result: RedeemResult | null;
  errorMessage: string;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 160 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isSuccess = state === 'success';
  const circleColor = isSuccess ? SUCCESS_COLOR : ERROR_COLOR;

  return (
    <View style={styles.resultOverlay}>
      <Animated.View style={[styles.resultCard, animatedStyle]}>
        <View style={[styles.iconCircle, { backgroundColor: circleColor }]}>
          {isSuccess ? <CheckmarkIcon /> : <XMarkIcon />}
        </View>

        <Text style={styles.resultTitle}>
          {isSuccess ? t('scanner.success') : errorMessage}
        </Text>

        {isSuccess && result?.dealTitle ? (
          <View style={styles.resultDetails}>
            <Text style={styles.resultDetailLabel}>{t('scanner.dealTitle')}</Text>
            <Text style={styles.resultDetailValue}>{result.dealTitle}</Text>
            {result.discount ? (
              <>
                <Text style={[styles.resultDetailLabel, { marginTop: 6 }]}>
                  {t('scanner.discount')}
                </Text>
                <Text style={styles.resultDetailValue}>{result.discount}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        <View style={{ marginTop: 24, width: '100%' }}>
          <Button
            variant={isSuccess ? 'primary' : 'danger'}
            title={isSuccess ? t('scanner.scanAnother') : t('scanner.tryAgain')}
            onPress={onReset}
            size="lg"
            fullWidth
          />
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Permission screen
// ---------------------------------------------------------------------------

function PermissionScreen({ onRequest }: { onRequest: () => void }) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.permissionContainer} edges={['top', 'bottom']}>
      <View style={styles.permissionInner}>
        <View style={styles.cameraIconOuter}>
          <View style={styles.cameraIconInner} />
          <View style={styles.cameraIconLens} />
        </View>

        <Text style={styles.permissionTitle}>{t('scanner.permission.title')}</Text>
        <Text style={styles.permissionMessage}>{t('scanner.permission.message')}</Text>

        <View style={{ marginTop: 32, width: '100%' }}>
          <Button
            variant="primary"
            size="lg"
            title={t('scanner.permission.grant')}
            onPress={onRequest}
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Main scanner screen
// ---------------------------------------------------------------------------

export default function ScannerScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualExpanded, setManualExpanded] = useState(false);

  const scanningRef = useRef(true);
  const autoResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoReset = useCallback(() => {
    if (autoResetTimer.current) {
      clearTimeout(autoResetTimer.current);
      autoResetTimer.current = null;
    }
  }, []);

  const resetScanner = useCallback(() => {
    clearAutoReset();
    setScanState('idle');
    setResult(null);
    setErrorMessage('');
    setManualCode('');
    scanningRef.current = true;
  }, [clearAutoReset]);

  useEffect(() => () => clearAutoReset(), [clearAutoReset]);

  const handleRedeemResult = useCallback(
    (data: RedeemResult) => {
      setResult(data);
      setScanState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      autoResetTimer.current = setTimeout(resetScanner, AUTO_RESET_MS);
    },
    [resetScanner],
  );

  const handleRedeemError = useCallback(
    (error: unknown) => {
      let msg = t('scanner.error.generic');

      if (error instanceof ApiError) {
        const status = error.status;
        const body = error.body as Record<string, unknown> | null;
        const code =
          typeof body === 'object' && body !== null && typeof body.code === 'string'
            ? body.code
            : null;

        if (status === 404 || code === 'NOT_FOUND') msg = t('scanner.error.notFound');
        else if (status === 410 || code === 'EXPIRED') msg = t('scanner.error.expired');
        else if (status === 409 || code === 'ALREADY_REDEEMED') msg = t('scanner.error.redeemed');
        else if (status === 401) msg = t('scanner.error.unauthorized', 'Unauthorized. Please sign in again.');
        else if (status === 400 || code === 'INVALID') msg = t('scanner.error.invalid');
        else if (error.message) msg = String(error.message);
      }

      setErrorMessage(msg);
      setScanState('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      autoResetTimer.current = setTimeout(resetScanner, AUTO_RESET_MS);
    },
    [t, resetScanner],
  );

  // Process offline queue when connectivity returns
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        processOfflineQueue();
      }
    });
    return () => unsubscribe();
  }, []);

  const parseQrData = useCallback((raw: string): { claimId: string; qrToken: string } | null => {
    try {
      // Try JSON format: { claimId, qrToken }
      const parsed = JSON.parse(raw);
      if (parsed.claimId && parsed.qrToken) return parsed;
    } catch {
      // Try URL format: ...?claimId=xxx&qrToken=yyy
      try {
        const url = new URL(raw);
        const claimId = url.searchParams.get('claimId');
        const qrToken = url.searchParams.get('qrToken');
        if (claimId && qrToken) return { claimId, qrToken };
      } catch {
        // Try plain redemption code format (legacy)
      }
    }
    return null;
  }, []);

  const redeemCode = useCallback(
    async (redemptionCode: string) => {
      const parsed = parseQrData(redemptionCode);

      // Check connectivity
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        if (parsed) {
          await addToOfflineQueue({
            claimId: parsed.claimId,
            qrToken: parsed.qrToken,
            timestamp: Date.now(),
          });
          handleRedeemResult({ dealTitle: 'Queued offline', discount: 'Will sync when online' });
        } else {
          handleRedeemError(new ApiError(0, { message: 'No connection. Could not parse QR.' }));
        }
        return;
      }

      try {
        let data: RedeemResult;
        if (parsed) {
          // Use the claimId-based endpoint
          data = await api.post<RedeemResult>(`/api/claims/${parsed.claimId}/redeem`, {
            qrToken: parsed.qrToken,
          });
        } else {
          // Fallback: plain redemption code
          data = await api.post<RedeemResult>('/api/claims/redeem', { redemptionCode });
        }
        handleRedeemResult(data ?? {});
      } catch (err) {
        handleRedeemError(err);
      }
    },
    [parseQrData, handleRedeemResult, handleRedeemError],
  );

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!scanningRef.current) return;
      scanningRef.current = false;
      setScanState('processing');
      redeemCode(data);
    },
    [redeemCode],
  );

  const onManualRedeem = useCallback(async () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    setManualLoading(true);
    scanningRef.current = false;
    setScanState('processing');
    await redeemCode(trimmed);
    setManualLoading(false);
  }, [manualCode, redeemCode]);

  // Permission loading
  if (!permission) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return <PermissionScreen onRequest={requestPermission} />;
  }

  const TAB_BAR_HEIGHT = 85;
  const VIEWFINDER_WIDTH = SCREEN_WIDTH * 0.78;
  const VIEWFINDER_HEIGHT = VIEWFINDER_WIDTH * 1.1; // taller than wide
  // Center the viewfinder between the top bar and the bottom controls area
  const topBarBottom = insets.top + 52;
  const bottomControlsTop = Dimensions.get('window').height - TAB_BAR_HEIGHT - 80;
  const availableSpace = bottomControlsTop - topBarBottom;
  const viewfinderTop = topBarBottom + (availableSpace - VIEWFINDER_HEIGHT) / 2 - 10;
  const sideInset = (SCREEN_WIDTH - VIEWFINDER_WIDTH) / 2;

  return (
    <View style={styles.root}>
      {/* Camera fills entire screen */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchEnabled}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanState === 'idle' ? onBarcodeScanned : undefined}
      />

      {/* Dark overlay with cutout */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.overlayBand, { top: 0, left: 0, right: 0, height: viewfinderTop }]} />
        <View
          style={[styles.overlayBand, { top: viewfinderTop + VIEWFINDER_HEIGHT, left: 0, right: 0, bottom: 0 }]}
        />
        <View
          style={[styles.overlayBand, { top: viewfinderTop, left: 0, width: sideInset, height: VIEWFINDER_HEIGHT }]}
        />
        <View
          style={[styles.overlayBand, { top: viewfinderTop, right: 0, width: sideInset, height: VIEWFINDER_HEIGHT }]}
        />
      </View>

      {/* Viewfinder frame */}
      <View style={[styles.viewfinderWrapper, { top: viewfinderTop }]} pointerEvents="none">
        <View style={[styles.viewfinder, { width: VIEWFINDER_WIDTH, height: VIEWFINDER_HEIGHT }]}>
          <CornerBrackets />
        </View>
        <Text style={styles.scanHint}>{t('scanner.scanning')}</Text>
      </View>

      {/* Top bar: title + torch button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.topTitle}>{t('scanner.title')}</Text>
        <Pressable
          onPress={() => setTorchEnabled((v) => !v)}
          style={[styles.torchButton, torchEnabled && styles.torchButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={t('scanner.torch')}
        >
          <TorchIcon active={torchEnabled} />
        </Pressable>
      </View>

      {/* Processing indicator */}
      {scanState === 'processing' ? (
        <View style={styles.processingBanner} pointerEvents="none">
          <Text style={styles.processingText}>{t('scanner.processing')}</Text>
        </View>
      ) : null}

      {/* Result overlay */}
      {(scanState === 'success' || scanState === 'error') ? (
        <ResultOverlay
          state={scanState}
          result={result}
          errorMessage={errorMessage}
          onReset={resetScanner}
        />
      ) : null}

      {/* Manual entry — collapsible, bottom area above tab bar */}
      <View style={[styles.manualArea, { bottom: TAB_BAR_HEIGHT + 8 }]}>
        {manualExpanded ? (
          <View style={styles.manualContainer}>
            <View style={styles.manualHeader}>
              <Text style={styles.manualLabel}>{t('scanner.manualEntryCollapsed')}</Text>
              <Pressable onPress={() => setManualExpanded(false)} hitSlop={12}>
                <Text style={{ color: '#8a8a8f', fontSize: 18, fontWeight: '600' }}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder={t('scanner.enterCode')}
                placeholderTextColor="#5a5a5f"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={onManualRedeem}
              />
              <Pressable
                onPress={onManualRedeem}
                disabled={!manualCode.trim() || manualLoading}
                style={[
                  styles.manualButton,
                  (!manualCode.trim() || manualLoading) && styles.manualButtonDisabled,
                ]}
              >
                <Text style={styles.manualButtonText}>
                  {manualLoading ? '...' : t('scanner.redeem')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setManualExpanded(true)}
            style={styles.manualIconButton}
            accessibilityRole="button"
            accessibilityLabel={t('scanner.manualEntryCollapsed')}
          >
            <KeyboardIcon />
            <Text style={styles.manualIconLabel}>{t('scanner.manualEntryCollapsed')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c0c0f',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Permission
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0c0c0f',
  },
  permissionInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cameraIconOuter: {
    width: 80,
    height: 64,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#c8e000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  cameraIconInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#c8e000',
  },
  cameraIconLens: {
    position: 'absolute',
    top: -8,
    left: 12,
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1a1f',
    borderWidth: 2,
    borderColor: '#c8e000',
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionMessage: {
    color: '#8a8a8f',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0c0c0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8a8a8f',
    fontSize: 15,
  },

  // Overlay bands
  overlayBand: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  // Viewfinder
  viewfinderWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  viewfinder: {
    position: 'relative',
  },
  scanHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Torch
  torchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchButtonActive: {
    backgroundColor: ACCENT,
  },

  // Processing
  processingBanner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Result overlay
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,12,15,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#1a1a1f',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a30',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  resultDetails: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#0c0c0f',
    borderRadius: 10,
    padding: 14,
  },
  resultDetailLabel: {
    color: '#8a8a8f',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resultDetailValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Manual entry
  manualArea: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  manualIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(26,26,31,0.95)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2a2a30',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  manualIconLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  manualContainer: {
    backgroundColor: 'rgba(26,26,31,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a30',
    padding: 14,
    width: '100%',
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  manualLabel: {
    color: '#8a8a8f',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manualInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0c0c0f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a30',
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 15,
  },
  manualButton: {
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: ACCENT,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualButtonDisabled: {
    opacity: 0.4,
  },
  manualButtonText: {
    color: '#0c0c0f',
    fontSize: 15,
    fontWeight: '700',
  },
});
