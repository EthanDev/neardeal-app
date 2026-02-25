import * as fs from 'fs';
import * as path from 'path';

const STORE_PATH = path.resolve(__dirname, '../lib/profile-store.ts');
const PROFILE_PATH = path.resolve(__dirname, '../app/(tabs)/profile.tsx');

const storeSrc = fs.readFileSync(STORE_PATH, 'utf-8');
const profileSrc = fs.readFileSync(PROFILE_PATH, 'utf-8');

describe('District preference (Issue #13)', () => {
  describe('profile-store.ts', () => {
    it('has a district field in ProfileState interface', () => {
      expect(storeSrc).toMatch(/district:\s*string/);
    });

    it('has a setDistrict action in ProfileState interface', () => {
      expect(storeSrc).toMatch(/setDistrict:\s*\(district:\s*string\)\s*=>/);
    });

    it('includes district in syncToBackend default payload', () => {
      expect(storeSrc).toMatch(/district:\s*get\(\)\.district/);
    });

    it('includes district in loadFromBackend', () => {
      expect(storeSrc).toMatch(/profile\.district/);
    });

    it('includes district in hydrate', () => {
      expect(storeSrc).toMatch(/neardeal_profile_district/);
    });
  });

  describe('profile.tsx', () => {
    it('does NOT have hardcoded useState for district', () => {
      expect(profileSrc).not.toMatch(/useState\(\s*['"]Floreasca['"]\s*\)/);
    });

    it('reads district from the profile store', () => {
      expect(profileSrc).toMatch(/useProfileStore.*district/s);
    });
  });
});
