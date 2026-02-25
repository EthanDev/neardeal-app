import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../app/(business)/profile/index.tsx'),
  'utf-8',
);

describe('Business profile actions', () => {
  test('Profile has an edit mode state toggle', () => {
    expect(src).toMatch(/editMode|setEditMode|isEditing|setIsEditing/);
  });

  test('Edit Profile save calls the API', () => {
    expect(src).toMatch(/api\.put|apiFetch|\/api\/business\/profile|\/business\/profile/);
  });

  test('Settings handler is defined as a function', () => {
    expect(src).toMatch(/handleSettings/);
  });

  test('Settings handler shows actual options', () => {
    expect(src).toMatch(/Alert\.alert.*[Ss]ettings|router\.push.*settings|setShowSettings|notif|language/);
  });
});
