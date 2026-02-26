import * as fs from 'fs';
import * as path from 'path';

describe('location-service frontend structural tests', () => {
  const servicePath = path.resolve(__dirname, '..', '..', '..', '..', 'neardeal-business', 'lib', 'location-service.ts');
  const content = fs.readFileSync(servicePath, 'utf8');

  it('imports expo-location', () => {
    expect(content).toContain('expo-location');
  });

  it('imports expo-task-manager', () => {
    expect(content).toContain('expo-task-manager');
  });

  it('defines a background location task name constant', () => {
    expect(content).toContain('BACKGROUND_LOCATION_TASK');
  });

  it('defines task with TaskManager.defineTask', () => {
    expect(content).toContain('TaskManager.defineTask');
  });

  it('requests foreground permissions', () => {
    expect(content).toContain('requestForegroundPermissionsAsync');
  });

  it('requests background permissions', () => {
    expect(content).toContain('requestBackgroundPermissionsAsync');
  });

  it('starts background location updates with correct config', () => {
    expect(content).toContain('startLocationUpdatesAsync');
    expect(content).toContain('Accuracy.Balanced');
    expect(content).toContain('distanceInterval');
  });

  it('uses distanceInterval of 200 meters', () => {
    expect(content).toMatch(/distanceInterval\s*:\s*200/);
  });

  it('stops background location updates', () => {
    expect(content).toContain('stopLocationUpdatesAsync');
  });

  it('sends location update to /api/location', () => {
    expect(content).toContain('/api/location');
  });

  it('extracts latitude and longitude from location data', () => {
    expect(content).toContain('latitude');
    expect(content).toContain('longitude');
  });
});

describe('update-location lambda structural tests', () => {
  const lambdaPath = path.resolve(__dirname, '..', 'location', 'update-location.ts');
  const content = fs.readFileSync(lambdaPath, 'utf8');

  it('extracts userId from JWT claims', () => {
    expect(content).toContain('requestContext.authorizer.jwt.claims.sub');
  });

  it('parses latitude and longitude from request body', () => {
    expect(content).toContain('latitude');
    expect(content).toContain('longitude');
  });

  it('uses Redis GEOADD to store user location', () => {
    expect(content).toContain('geoadd');
  });

  it('uses Redis GEORADIUS to find nearby deals', () => {
    expect(content).toContain('georadius');
  });

  it('returns 400 for missing coordinates', () => {
    expect(content).toContain('respond(400');
  });

  it('returns 200 on success with nearby count', () => {
    expect(content).toContain('respond(200');
    expect(content).toContain('nearbyCount');
  });

  it('uses the deals:geo key for geo queries', () => {
    expect(content).toContain('deals:geo');
  });

  it('stores user location in users:geo key', () => {
    expect(content).toContain('users:geo');
  });
});

describe('api-stack location route', () => {
  const apiStackPath = path.resolve(__dirname, '..', '..', 'stacks', 'api-stack.ts');
  const content = fs.readFileSync(apiStackPath, 'utf8');

  it('has POST /api/location route', () => {
    expect(content).toContain('/api/location');
    expect(content).toContain('HttpMethod.POST');
  });

  it('uses consumer authorizer for location route', () => {
    expect(content).toContain('UpdateLocation');
  });
});

describe('app.json background location permissions', () => {
  const appJsonPath = path.resolve(__dirname, '..', '..', '..', '..', 'neardeal-business', 'app.json');
  const content = fs.readFileSync(appJsonPath, 'utf8');
  const config = JSON.parse(content);

  it('has background location permission string in expo-location plugin', () => {
    const locationPlugin = config.expo.plugins.find(
      (p: any) => Array.isArray(p) && p[0] === 'expo-location'
    );
    expect(locationPlugin).toBeDefined();
    expect(locationPlugin[1]).toHaveProperty('locationAlwaysAndWhenInUsePermission');
  });

  it('has NSLocationAlwaysAndWhenInUseUsageDescription in iOS infoPlist', () => {
    expect(config.expo.ios.infoPlist).toHaveProperty('NSLocationAlwaysAndWhenInUseUsageDescription');
  });

  it('has expo-task-manager in plugins', () => {
    const hasTaskManager = config.expo.plugins.some(
      (p: any) => p === 'expo-task-manager' || (Array.isArray(p) && p[0] === 'expo-task-manager')
    );
    expect(hasTaskManager).toBe(true);
  });
});
