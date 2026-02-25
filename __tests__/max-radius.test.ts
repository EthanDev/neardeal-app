/**
 * Structural tests for max radius feature (Issue #15)
 * Verifies that profile-store has maxRadius field and profile.tsx uses it
 */
import * as fs from 'fs';
import * as path from 'path';

const STORE_PATH = path.resolve(__dirname, '../lib/profile-store.ts');
const PROFILE_PATH = path.resolve(__dirname, '../app/(tabs)/profile.tsx');

const storeSource = fs.readFileSync(STORE_PATH, 'utf-8');
const profileSource = fs.readFileSync(PROFILE_PATH, 'utf-8');

describe('Max Radius Feature', () => {
  describe('profile-store.ts', () => {
    it('should have a maxRadius field in ProfileState interface', () => {
      expect(storeSource).toMatch(/maxRadius:\s*number/);
    });

    it('should have a setMaxRadius action', () => {
      expect(storeSource).toMatch(/setMaxRadius/);
    });

    it('should default maxRadius to 500', () => {
      expect(storeSource).toMatch(/maxRadius:\s*500/);
    });

    it('should include maxRadius in syncToBackend payload', () => {
      // The syncToBackend default payload should reference maxRadius
      expect(storeSource).toMatch(/maxRadius.*syncToBackend|syncToBackend[\s\S]*maxRadius/);
    });

    it('should include maxRadius in loadFromBackend', () => {
      expect(storeSource).toMatch(/profile\.maxRadius/);
    });

    it('should include maxRadius in hydrate', () => {
      expect(storeSource).toMatch(/neardeal_max_radius/);
    });
  });

  describe('profile.tsx', () => {
    it('should NOT have hardcoded 500m for max radius', () => {
      // The old hardcoded value should be replaced with dynamic store value
      // We check there's no standalone '>500m<' text that isn't from the store
      expect(profileSource).not.toMatch(/>500m</);
    });

    it('should reference maxRadius from the store', () => {
      expect(profileSource).toMatch(/maxRadius/);
    });

    it('should have a radius picker modal or action sheet', () => {
      expect(profileSource).toMatch(/radiusPickerOpen|radiusPicker|showRadiusPicker/);
    });

    it('should have radius options including 200, 500, 1000, 2000, 5000', () => {
      expect(profileSource).toMatch(/200/);
      expect(profileSource).toMatch(/1000/);
      expect(profileSource).toMatch(/2000/);
      expect(profileSource).toMatch(/5000/);
    });
  });
});
