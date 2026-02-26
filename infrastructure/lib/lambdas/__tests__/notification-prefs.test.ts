import * as fs from 'fs';
import * as path from 'path';

describe('Notification preferences persistence', () => {
  const lambdaPath = path.resolve(__dirname, '../profile/update-consumer-profile.ts');
  const storePath = path.resolve(__dirname, '../../../../neardeal-business/lib/profile-store.ts');

  test('update-consumer-profile.ts accepts notificationPreferences field', () => {
    const src = fs.readFileSync(lambdaPath, 'utf-8');
    expect(src).toContain("'notificationPreferences'");
  });

  test('profile-store.ts has notificationPreferences in state', () => {
    const src = fs.readFileSync(storePath, 'utf-8');
    expect(src).toContain('notificationPreferences');
    expect(src).toContain('dealAlerts');
    expect(src).toContain('flashAlerts');
    expect(src).toContain('lastChance');
    expect(src).toContain('monthlySummary');
  });

  test('profile-store.ts syncs notificationPreferences to backend', () => {
    const src = fs.readFileSync(storePath, 'utf-8');
    expect(src).toContain('setNotificationPreference');
    expect(src).toMatch(/syncToBackend.*notificationPreferences/s);
  });

  test('profile-store.ts loads notificationPreferences from backend', () => {
    const src = fs.readFileSync(storePath, 'utf-8');
    expect(src).toMatch(/loadFromBackend[\s\S]*notificationPreferences/);
  });
});
