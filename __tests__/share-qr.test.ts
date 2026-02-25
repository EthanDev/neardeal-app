import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve(
  __dirname,
  '../app/(business)/deals/[id].tsx',
);
const source = fs.readFileSync(filePath, 'utf-8');

describe('Share QR button in deals/[id].tsx', () => {
  it('imports Share from react-native', () => {
    expect(source).toMatch(/import\s+\{[^}]*Share[^}]*\}\s+from\s+['"]react-native['"]/);
  });

  it('calls Share.share() in the share handler', () => {
    expect(source).toMatch(/Share\.share\s*\(/);
  });

  it('does not contain "coming soon" text for QR sharing', () => {
    expect(source).not.toMatch(/QR sharing coming soon/i);
  });
});
