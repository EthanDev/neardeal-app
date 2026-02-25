import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { apiFetch } from './api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BACKGROUND_LOCATION_TASK = 'neardeal-background-location';

// ---------------------------------------------------------------------------
// Background task definition
// ---------------------------------------------------------------------------

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[LocationService] Background task error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const latest = locations[locations.length - 1];
      const { latitude, longitude } = latest.coords;

      try {
        await apiFetch('/api/location', {
          method: 'POST',
          body: { latitude, longitude },
        });
      } catch (err) {
        console.warn('[LocationService] Failed to send location update:', err);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  // Request foreground first
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    return { foreground: false, background: false };
  }

  // Then request background
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  return {
    foreground: true,
    background: bgStatus === 'granted',
  };
}

// ---------------------------------------------------------------------------
// Start / Stop background location
// ---------------------------------------------------------------------------

export async function startBackgroundLocation(): Promise<boolean> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (hasStarted) {
    return true; // Already running
  }

  const { foreground, background } = await requestLocationPermissions();
  if (!foreground || !background) {
    return false;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 200, // 200 meters
    deferredUpdatesInterval: 60_000, // At most once per minute
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'NearDeal',
      notificationBody: 'Finding deals near you',
      notificationColor: '#c8e000',
    },
  });

  return true;
}

export async function stopBackgroundLocation(): Promise<void> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
