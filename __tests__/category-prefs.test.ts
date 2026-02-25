import { readFileSync } from 'fs';
import { resolve } from 'path';

const storeSrc = readFileSync(
  resolve(__dirname, '../lib/profile-store.ts'),
  'utf-8',
);

const profileSrc = readFileSync(
  resolve(__dirname, '../app/(tabs)/profile.tsx'),
  'utf-8',
);

describe('Category preferences', () => {
  test('profile-store.ts declares selectedCategories: string[]', () => {
    expect(storeSrc).toMatch(/selectedCategories:\s*string\[\]/);
  });

  test('profile-store.ts has setSelectedCategories action', () => {
    expect(storeSrc).toMatch(/setSelectedCategories/);
  });

  test('profile-store.ts syncs selectedCategories to backend', () => {
    expect(storeSrc).toMatch(/syncToBackend\(.*selectedCategories/);
  });

  test('profile-store.ts loads selectedCategories from backend', () => {
    expect(storeSrc).toMatch(/profile\.selectedCategories/);
  });

  test('profile-store.ts persists to SecureStore', () => {
    expect(storeSrc).toMatch(/neardeal_selected_categories/);
  });

  test('profile.tsx does NOT use local useState for categories', () => {
    expect(profileSrc).not.toMatch(/useState<string\[\]>\(\s*\[\s*'food'/);
  });

  test('profile.tsx reads from profileStore', () => {
    expect(profileSrc).toMatch(/profileStore\.selectedCategories/);
  });

  test('profile.tsx calls store setter', () => {
    expect(profileSrc).toMatch(/profileStore\.setSelectedCategories/);
  });
});
