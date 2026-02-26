# Background Location Tracking - Verification Plan

## Feature
Background location tracking for proximity-based deal notifications.

## Components
1. **Frontend**: `neardeal-business/lib/location-service.ts` - Location permission flow, background task registration, location update API calls
2. **Backend**: `infrastructure/lib/lambdas/location/update-location.ts` - POST /api/location endpoint, Redis GEOADD for user location, returns nearby deal count
3. **API Route**: POST /api/location with consumerAuthorizer in api-stack.ts
4. **App Config**: Background location permissions in app.json, expo-task-manager dependency
5. **App Startup**: Background tracking initialization in _layout.tsx after auth hydration

## Test Cases

### Frontend (location-service.ts) - Structural Tests
- [ ] Imports expo-location and expo-task-manager
- [ ] Defines BACKGROUND_LOCATION_TASK constant
- [ ] requestLocationPermissions() requests foreground then background permissions
- [ ] startBackgroundLocation() calls Location.startLocationUpdatesAsync with correct config
- [ ] stopBackgroundLocation() calls Location.stopLocationUpdatesAsync
- [ ] Background task handler calls /api/location with lat/lng
- [ ] Uses TaskManager.defineTask to register the background task
- [ ] Uses Location.Accuracy.Balanced and distanceInterval: 200

### Backend (update-location.ts) - Structural Tests
- [ ] Extracts userId from JWT claims
- [ ] Parses latitude/longitude from request body
- [ ] Uses Redis GEOADD to store user location
- [ ] Returns nearby deal count using GEORADIUS
- [ ] Returns 400 for missing/invalid coordinates
- [ ] Returns 200 with nearbyCount on success

### API Stack
- [ ] POST /api/location route exists
- [ ] Uses consumerAuthorizer

### App Config
- [ ] app.json has locationAlwaysAndWhenInUsePermission
- [ ] expo-location plugin has background permission string
- [ ] expo-task-manager is in plugins

## Manual Testing
- [ ] App requests foreground location permission on first load
- [ ] App requests background location permission after foreground granted
- [ ] Location updates arrive in background (check Lambda CloudWatch logs)
- [ ] Redis contains user geo data after location update
