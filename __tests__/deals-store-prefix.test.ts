import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Structural test: every API call inside useDealsStore must use the /api/deals
 * prefix so requests hit the correct backend routes.
 */
describe('useDealsStore API prefix', () => {
  const storePath = resolve(__dirname, '../lib/store.ts');
  const source = readFileSync(storePath, 'utf-8');

  // Extract only the useDealsStore block (from its declaration to the closing `}));`)
  const storeStart = source.indexOf('export const useDealsStore');
  const storeEnd = source.indexOf('}));', storeStart) + 3;
  const dealsStoreBlock = source.slice(storeStart, storeEnd);

  it('should have extracted the useDealsStore block', () => {
    expect(dealsStoreBlock).toContain('useDealsStore');
  });

  it('all API calls use /api/deals prefix', () => {
    // Match quoted strings containing /deals (template literals use backticks)
    const apiCallPattern = /(?:get|post|put|delete)<[^>]*>\(\s*[`'"]([^`'"]+)[`'"]/g;
    const paths: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = apiCallPattern.exec(dealsStoreBlock)) !== null) {
      paths.push(match[1]);
    }

    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(p).toMatch(/^\/api\/deals/);
    }
  });

  it('no bare /deals paths without /api/ prefix', () => {
    // Ensure there are no occurrences of '/deals or `/deals that aren't preceded by /api
    const barePattern = /(?<!\/api)['"`]\/deals/g;
    const matches = dealsStoreBlock.match(barePattern);
    expect(matches).toBeNull();
  });
});
