import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../app/(tabs)/profile.tsx'),
  'utf-8',
);

describe('Profile sign-out', () => {
  test('references useAuthStore', () => {
    expect(src).toMatch(/useAuthStore/);
  });

  test('imports router from expo-router', () => {
    expect(src).toMatch(/from\s+['"]expo-router['"]/);
  });

  test('sign-out TouchableOpacity has onPress', () => {
    expect(src).toMatch(/<TouchableOpacity[^>]*?onPress[^>]*?>[\s\S]*?sign\s*[Oo]ut/i);
  });

  test('calls logout()', () => {
    expect(src).toMatch(/logout\(\)/);
  });

  test('navigates to login after sign-out', () => {
    expect(src).toMatch(/router\.replace.*login|replace.*auth.*login/i);
  });
});
