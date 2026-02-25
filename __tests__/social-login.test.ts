/**
 * Structural test: verifies social login buttons are not no-ops.
 *
 * Social login (Apple, Google, Facebook) is not yet wired up to real
 * identity providers. The buttons must either be hidden or clearly
 * indicate "coming soon" with a user-facing Alert — they must NOT have
 * empty `() => {}` handlers that silently do nothing.
 */
import * as fs from 'fs';
import * as path from 'path';

const loginSource = fs.readFileSync(
  path.resolve(__dirname, '../app/(auth)/login.tsx'),
  'utf-8',
);

describe('social login buttons', () => {
  test('no empty onPress handlers remain', () => {
    // Match onPress={() => {}} with optional whitespace
    const emptyHandlers = loginSource.match(/onPress=\{?\(\)\s*=>\s*\{\s*\}\}?/g) || [];
    expect(emptyHandlers).toHaveLength(0);
  });

  test('social buttons show a coming-soon alert or are removed', () => {
    // If social buttons exist, they must reference Alert or "coming soon"
    const hasSocialButtons =
      loginSource.includes('auth.login.apple') ||
      loginSource.includes('auth.login.google') ||
      loginSource.includes('auth.login.facebook');

    if (hasSocialButtons) {
      expect(loginSource).toContain('Alert.alert');
      expect(loginSource.toLowerCase()).toContain('coming soon');
    }
  });

  test('social buttons are visually marked as disabled', () => {
    const hasSocialButtons =
      loginSource.includes('auth.login.apple') ||
      loginSource.includes('auth.login.google') ||
      loginSource.includes('auth.login.facebook');

    if (hasSocialButtons) {
      // Buttons should be disabled
      expect(loginSource).toMatch(/disabled.*social|disabled={true}/s);
    }
  });
});
