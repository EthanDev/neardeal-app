import * as fs from 'fs';
import * as path from 'path';

const STORE_PATH = path.resolve(__dirname, '../lib/profile-store.ts');
const PROFILE_PATH = path.resolve(__dirname, '../app/(tabs)/profile.tsx');

const storeSrc = fs.readFileSync(STORE_PATH, 'utf-8');
const profileSrc = fs.readFileSync(PROFILE_PATH, 'utf-8');

describe('Quiet hours persistence (Issue #14)', () => {
  describe('profile-store.ts', () => {
    it('has quietStartHour field in ProfileState interface', () => {
      expect(storeSrc).toMatch(/quietStartHour:\s*number/);
    });

    it('has quietEndHour field in ProfileState interface', () => {
      expect(storeSrc).toMatch(/quietEndHour:\s*number/);
    });

    it('has setQuietHours action in ProfileState interface', () => {
      expect(storeSrc).toMatch(/setQuietHours:\s*\(start:\s*number,\s*end:\s*number\)\s*=>/);
    });

    it('includes quietStartHour in syncToBackend default payload', () => {
      expect(storeSrc).toMatch(/quietStartHour:\s*get\(\)\.quietStartHour/);
    });

    it('includes quietEndHour in syncToBackend default payload', () => {
      expect(storeSrc).toMatch(/quietEndHour:\s*get\(\)\.quietEndHour/);
    });

    it('includes quiet hours in loadFromBackend', () => {
      expect(storeSrc).toMatch(/profile\.quietStartHour/);
      expect(storeSrc).toMatch(/profile\.quietEndHour/);
    });

    it('includes quiet hours in hydrate', () => {
      expect(storeSrc).toMatch(/neardeal_quiet_start_hour/);
      expect(storeSrc).toMatch(/neardeal_quiet_end_hour/);
    });

    it('defaults quietStartHour to 22', () => {
      expect(storeSrc).toMatch(/quietStartHour:\s*22/);
    });

    it('defaults quietEndHour to 8', () => {
      expect(storeSrc).toMatch(/quietEndHour:\s*8/);
    });
  });

  describe('profile.tsx', () => {
    it('does NOT have local useState for quietStart Date', () => {
      expect(profileSrc).not.toMatch(/useState\(\s*new Date\(2024,\s*0,\s*1,\s*22/);
    });

    it('does NOT have local useState for quietEnd Date', () => {
      expect(profileSrc).not.toMatch(/useState\(\s*new Date\(2024,\s*0,\s*1,\s*8/);
    });

    it('reads quiet hours from the profile store', () => {
      expect(profileSrc).toMatch(/quietStartHour/);
      expect(profileSrc).toMatch(/quietEndHour/);
    });

    it('calls setQuietHours from the store', () => {
      expect(profileSrc).toMatch(/setQuietHours/);
    });
  });
});
