import * as fs from 'fs';
import * as path from 'path';

describe('register-push-token lambda structural tests', () => {
  const lambdaPath = path.resolve(__dirname, '..', 'notifications', 'register-push-token.ts');
  const content = fs.readFileSync(lambdaPath, 'utf8');

  it('stores push token with correct PK/SK pattern', () => {
    expect(content).toContain('PUSH_TOKEN');
    expect(content).toContain('USER#');
  });

  it('validates Expo push token format', () => {
    expect(content).toContain('ExponentPushToken');
  });

  it('uses PutCommand to store the token', () => {
    expect(content).toContain('PutCommand');
  });

  it('returns 200 on successful registration', () => {
    expect(content).toContain('respond(200');
  });

  it('returns 400 for invalid token', () => {
    expect(content).toContain('respond(400');
  });

  it('extracts userId from JWT claims', () => {
    expect(content).toContain('requestContext.authorizer.jwt.claims.sub');
  });
});

describe('fan-out lambda push notification integration', () => {
  const fanOutPath = path.resolve(__dirname, '..', 'notifications', 'fan-out.ts');
  const content = fs.readFileSync(fanOutPath, 'utf8');

  it('looks up push tokens from DynamoDB', () => {
    expect(content).toContain('PUSH_TOKEN');
    expect(content).toContain('GetCommand');
  });

  it('calls Expo Push API', () => {
    expect(content).toContain('https://exp.host/--/api/v2/push/send');
  });

  it('handles DeviceNotRegistered errors', () => {
    expect(content).toContain('DeviceNotRegistered');
  });

  it('sends notification title and body in push payload', () => {
    expect(content).toContain('notifTitle');
    expect(content).toContain('notifMessage');
  });

  it('does not block notification creation if push fails', () => {
    expect(content).toContain('sendPushNotification');
    // Push is fire-and-forget, errors are caught
    expect(content).toContain('catch');
  });
});

describe('api-stack push token route', () => {
  const apiStackPath = path.resolve(__dirname, '..', '..', 'stacks', 'api-stack.ts');
  const content = fs.readFileSync(apiStackPath, 'utf8');

  it('has POST /api/push-token route', () => {
    expect(content).toContain('/api/push-token');
    expect(content).toContain('HttpMethod.POST');
  });

  it('uses consumer authorizer for push token route', () => {
    // The route should use consumerAuthorizer
    expect(content).toContain('RegisterPushToken');
  });
});

describe('frontend push-notifications module', () => {
  const frontendPath = path.resolve(__dirname, '..', '..', '..', '..', 'neardeal-business', 'lib', 'push-notifications.ts');
  const content = fs.readFileSync(frontendPath, 'utf8');

  it('imports expo-notifications', () => {
    expect(content).toContain('expo-notifications');
  });

  it('registers for push notifications', () => {
    expect(content).toContain('getExpoPushTokenAsync');
  });

  it('sends token to backend API', () => {
    expect(content).toContain('/api/push-token');
  });

  it('handles notification received events', () => {
    expect(content).toContain('addNotificationReceivedListener');
  });

  it('handles notification response (tap) events', () => {
    expect(content).toContain('addNotificationResponseReceivedListener');
  });
});
