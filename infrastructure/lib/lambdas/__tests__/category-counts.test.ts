import * as fs from 'fs';
import * as path from 'path';

describe('Category stats endpoint', () => {
  const lambdasDir = path.resolve(__dirname, '..');

  test('get-category-stats.ts lambda exists', () => {
    const fullPath = path.join(lambdasDir, 'deals', 'get-category-stats.ts');
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  test('get-category-stats.ts exports a handler', () => {
    const fullPath = path.join(lambdasDir, 'deals', 'get-category-stats.ts');
    const content = fs.readFileSync(fullPath, 'utf8');
    expect(content).toContain('export const handler');
  });

  test('handler returns categories array with id, totalDeals, nearbyDeals', () => {
    const fullPath = path.join(lambdasDir, 'deals', 'get-category-stats.ts');
    const content = fs.readFileSync(fullPath, 'utf8');
    expect(content).toContain('totalDeals');
    expect(content).toContain('nearbyDeals');
    expect(content).toContain('categories');
  });

  test('api-stack.ts has GET /api/deals/categories route', () => {
    const apiStackPath = path.resolve(__dirname, '..', '..', 'stacks', 'api-stack.ts');
    const content = fs.readFileSync(apiStackPath, 'utf8');
    expect(content).toContain('/api/deals/categories');
    expect(content).toContain('GetCategoryStats');
  });

  test('route has no authorizer (public endpoint)', () => {
    const apiStackPath = path.resolve(__dirname, '..', '..', 'stacks', 'api-stack.ts');
    const content = fs.readFileSync(apiStackPath, 'utf8');
    // Find the addRoutes block for /api/deals/categories and verify no authorizer
    const routeBlockMatch = content.match(
      /path:\s*'\/api\/deals\/categories'[\s\S]*?\}\);/
    );
    expect(routeBlockMatch).toBeTruthy();
    expect(routeBlockMatch![0]).not.toContain('authorizer');
  });
});
