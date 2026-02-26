import * as fs from 'fs';
import * as path from 'path';

describe('create-claim lambda structural tests', () => {
  const claimLambdaPath = path.resolve(__dirname, '..', 'claims', 'create-claim.ts');
  const content = fs.readFileSync(claimLambdaPath, 'utf8');

  it('uses TransactWriteCommand for atomic operations', () => {
    expect(content).toContain('TransactWriteCommand');
  });

  it('has ConditionExpression on the Update item to prevent overselling', () => {
    expect(content).toContain("ConditionExpression: 'currentClaims < maxClaims'");
  });

  it('handles TransactionCanceledException', () => {
    expect(content).toContain('TransactionCanceledException');
  });

  it('creates claim record with idempotency check', () => {
    expect(content).toContain("ConditionExpression: 'attribute_not_exists(PK)'");
  });

  it('generates HMAC-signed QR token', () => {
    expect(content).toContain('createHmac');
    expect(content).toContain('qrToken');
  });

  it('invalidates Redis cache after claiming', () => {
    expect(content).toContain('r.del(`deal:${dealId}`)');
  });

  it('returns 201 on successful claim', () => {
    expect(content).toContain('respond(201');
  });

  it('checks for expired deals', () => {
    expect(content).toContain('Deal has expired');
    expect(content).toContain('respond(410');
  });

  it('checks for existing claims (idempotency)', () => {
    expect(content).toContain('You have already claimed this deal');
    expect(content).toContain('respond(409');
  });
});
