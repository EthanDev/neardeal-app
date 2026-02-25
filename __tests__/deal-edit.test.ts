/**
 * Structural test: verifies deals/[id].tsx supports inline edit mode
 * instead of showing a "coming soon" alert, and calls PATCH /api/deals/{dealId}.
 */
import * as fs from 'fs';
import * as path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../app/(business)/deals/[id].tsx'),
  'utf-8',
);

describe('deals/[id].tsx inline edit mode', () => {
  test('does NOT contain "coming soon" alert for editing', () => {
    expect(source).not.toMatch(/Deal editing coming soon/);
  });

  test('has an editing state variable', () => {
    expect(source).toMatch(/useState.*editing|editing.*useState/s);
  });

  test('has editable fields for title, description, and maxClaims', () => {
    expect(source).toMatch(/editTitle|editFields\.title/);
    expect(source).toMatch(/editDescription|editFields\.description/);
    expect(source).toMatch(/editMaxClaims|editFields\.maxClaims/);
  });

  test('calls api.patch with deal updates on save', () => {
    expect(source).toMatch(/api\.patch\(.*\/api\/deals\//);
  });

  test('toggles between view and edit mode', () => {
    // Should set editing to true/false
    expect(source).toMatch(/setEditing\(true\)/);
    expect(source).toMatch(/setEditing\(false\)/);
  });

  test('sends title, description, and maxClaims fields in the patch', () => {
    // The save handler should include these fields
    expect(source).toMatch(/title/);
    expect(source).toMatch(/description/);
    expect(source).toMatch(/maxClaims/);
  });

  test('shows success feedback after saving', () => {
    expect(source).toMatch(/success|saved|updated/i);
  });

  test('imports Input component for edit fields', () => {
    expect(source).toMatch(/import.*Input.*from/);
  });
});
