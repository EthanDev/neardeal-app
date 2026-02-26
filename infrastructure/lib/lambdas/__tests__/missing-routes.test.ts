import * as fs from 'fs';
import * as path from 'path';

describe('Missing API routes - lambda files exist', () => {
  const lambdasDir = path.resolve(__dirname, '..');

  const expectedLambdas = [
    'profile/get-consumer-profile.ts',
    'deals/list-business-deals.ts',
    'deals/update-deal.ts',
    'deals/delete-deal.ts',
    'claims/list-deal-claims.ts',
    'notifications/get-notifications.ts',
    'notifications/mark-read.ts',
    'notifications/delete-notification.ts',
    'billing/get-subscription.ts',
  ];

  for (const lambdaPath of expectedLambdas) {
    test(`${lambdaPath} exists`, () => {
      const fullPath = path.join(lambdasDir, lambdaPath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });

    test(`${lambdaPath} exports a handler`, () => {
      const fullPath = path.join(lambdasDir, lambdaPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).toContain('export const handler');
    });
  }
});

describe('API stack routes configuration', () => {
  test('api-stack.ts contains all required routes', () => {
    const apiStackPath = path.resolve(__dirname, '..', '..', 'stacks', 'api-stack.ts');
    const content = fs.readFileSync(apiStackPath, 'utf8');

    const expectedRoutes = [
      '/api/consumer/profile',
      '/api/deals/{dealId}/claims',
      '/api/notifications',
      '/api/notifications/read',
      '/api/notifications/{id}',
      '/api/business/subscription',
    ];

    for (const route of expectedRoutes) {
      expect(content).toContain(route);
    }
  });
});
