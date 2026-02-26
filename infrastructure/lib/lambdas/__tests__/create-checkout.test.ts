import * as fs from 'fs';
import * as path from 'path';

describe('create-checkout lambda structural tests', () => {
  const lambdaPath = path.resolve(__dirname, '..', 'billing', 'create-checkout.ts');
  const content = fs.readFileSync(lambdaPath, 'utf8');

  it('lambda file exists', () => {
    expect(fs.existsSync(lambdaPath)).toBe(true);
  });

  it('exports a handler function', () => {
    expect(content).toContain('export const handler');
  });

  it('accepts planId from request body', () => {
    expect(content).toContain('planId');
  });

  it('looks up business profile from DynamoDB for stripeCustomerId', () => {
    expect(content).toContain('`BIZ#${businessId}`');
    expect(content).toContain('stripeCustomerId');
  });

  it('creates a Stripe Checkout Session', () => {
    expect(content).toContain('checkout/sessions');
  });

  it('returns a checkoutUrl in the response', () => {
    expect(content).toContain('checkoutUrl');
  });

  it('retrieves Stripe secret key from Secrets Manager', () => {
    expect(content).toContain('STRIPE_SECRET_ARN');
    expect(content).toContain('GetSecretValueCommand');
  });

  it('returns 401 for unauthorized requests', () => {
    expect(content).toContain('respond(401');
  });

  it('returns 400 for missing planId', () => {
    expect(content).toContain('respond(400');
  });

  it('includes businessId and planTier in session metadata', () => {
    expect(content).toContain('metadata');
    expect(content).toContain('businessId');
    expect(content).toContain('planTier');
  });
});

describe('api-stack checkout route', () => {
  const apiStackPath = path.resolve(__dirname, '..', '..', 'stacks', 'api-stack.ts');
  const content = fs.readFileSync(apiStackPath, 'utf8');

  it('registers POST /api/business/checkout route', () => {
    expect(content).toContain("'/api/business/checkout'");
    expect(content).toContain('CreateCheckout');
  });

  it('uses businessAuthorizer for checkout route', () => {
    const checkoutSection = content.slice(content.indexOf('CreateCheckout'));
    expect(checkoutSection).toContain('businessAuthorizer');
  });
});
