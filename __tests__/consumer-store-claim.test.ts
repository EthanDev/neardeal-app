import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Structural test: claimDeal in consumer-store must call the real API,
 * not create a fake local claim object.
 */
describe('consumer-store claimDeal', () => {
  const storePath = resolve(__dirname, '../lib/consumer-store.ts');
  const source = readFileSync(storePath, 'utf-8');

  // Extract the claimDeal implementation (skip the interface type declaration)
  const storeStart = source.indexOf('create<ConsumerState>');
  const implSource = source.slice(storeStart);
  const claimStart = implSource.indexOf('claimDeal:');
  const claimEnd = implSource.indexOf('toggleSavedDeal:', claimStart);
  const claimBlock = implSource.slice(claimStart, claimEnd);

  it('should find the claimDeal method', () => {
    expect(claimStart).toBeGreaterThan(-1);
    expect(claimBlock).toContain('claimDeal');
  });

  it('claimDeal must be async (calls a real API)', () => {
    expect(claimBlock).toMatch(/claimDeal:\s*async/);
  });

  it('claimDeal calls POST /api/claims', () => {
    expect(claimBlock).toContain("'/api/claims'");
    expect(claimBlock).toMatch(/api\.post/);
  });

  it('does NOT fabricate a local-only claim with a fake id prefix', () => {
    // The old mock used `c-${dealId}` as a fake claim id
    expect(claimBlock).not.toMatch(/`c-\$\{dealId\}`/);
  });

  it('claimDeal imports and uses the api module', () => {
    expect(claimBlock).toContain("import('./api')");
  });
});
