import * as fs from 'fs';
import * as path from 'path';

const LAMBDAS_DIR = path.resolve(__dirname, '..');

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Business PK prefix consistency', () => {
  const lambdaFiles = getAllTsFiles(LAMBDAS_DIR);

  test('no lambda files should contain BUSINESS# string', () => {
    const violations: string[] = [];
    for (const file of lambdaFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('BUSINESS#')) {
        violations.push(path.relative(LAMBDAS_DIR, file));
      }
    }
    expect(violations).toEqual([]);
  });

  test('business-post-confirmation uses BIZ# prefix', () => {
    const filePath = path.join(LAMBDAS_DIR, 'auth', 'business-post-confirmation.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('BIZ#');
    expect(content).not.toContain('BUSINESS#');
  });
});
