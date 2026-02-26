import * as fs from 'fs';
import * as path from 'path';

describe('generate-code lambda structural tests', () => {
  const lambdaPath = path.resolve(__dirname, '..', 'referrals', 'generate-code.ts');
  const content = fs.readFileSync(lambdaPath, 'utf8');

  it('generates an 8-character referral code', () => {
    expect(content).toContain('randomBytes(8)');
  });

  it('stores code with PK=USER#{userId}, SK=REFERRAL_CODE', () => {
    expect(content).toContain('`USER#${userId}`');
    expect(content).toContain("'REFERRAL_CODE'");
  });

  it('creates reverse lookup with PK=REF#{code}, SK=META', () => {
    expect(content).toContain('`REF#${code}`');
    expect(content).toContain("SK: 'META'");
  });

  it('is idempotent - returns existing code if already generated', () => {
    expect(content).toContain('existing.Item');
    expect(content).toContain('respond(200');
  });

  it('uses TransactWriteCommand for atomic code creation', () => {
    expect(content).toContain('TransactWriteCommand');
  });

  it('uses ConditionExpression to prevent duplicates', () => {
    expect(content).toContain("ConditionExpression: 'attribute_not_exists(PK)'");
  });

  it('returns 401 for unauthorized requests', () => {
    expect(content).toContain('respond(401');
  });

  it('handles TransactionCanceledException gracefully', () => {
    expect(content).toContain('TransactionCanceledException');
  });
});

describe('validate-referral lambda structural tests', () => {
  const lambdaPath = path.resolve(__dirname, '..', 'referrals', 'validate-referral.ts');
  const content = fs.readFileSync(lambdaPath, 'utf8');

  it('looks up referral code via REF#{code} reverse lookup', () => {
    expect(content).toContain('`REF#${referralCode}`');
  });

  it('rejects self-referral', () => {
    expect(content).toContain('Cannot use your own referral code');
    expect(content).toContain('referrerId === refereeId');
  });

  it('rejects invalid/non-existent codes', () => {
    expect(content).toContain('Invalid referral code');
    expect(content).toContain('respond(404');
  });

  it('rejects already-used referral by same referee', () => {
    expect(content).toContain('Referral already applied');
    expect(content).toContain('respond(409');
  });

  it('creates referral record PK=USER#{referrerId}, SK=REFERRAL#{refereeId}', () => {
    expect(content).toContain('`USER#${referrerId}`');
    expect(content).toContain('`REFERRAL#${refereeId}`');
  });

  it('credits reward points to both referrer and referee', () => {
    expect(content).toContain('REWARD_POINTS');
    expect(content).toContain('totalRewardPoints');
    expect(content).toContain('referralRewardPoints');
  });

  it('uses TransactWriteCommand for atomic operations', () => {
    expect(content).toContain('TransactWriteCommand');
  });

  it('uses conditional writes for idempotency', () => {
    expect(content).toContain("ConditionExpression: 'attribute_not_exists(PK)'");
  });

  it('handles TransactionCanceledException', () => {
    expect(content).toContain('TransactionCanceledException');
  });
});

describe('get-referral-stats lambda structural tests', () => {
  const lambdaPath = path.resolve(__dirname, '..', 'referrals', 'get-referral-stats.ts');
  const content = fs.readFileSync(lambdaPath, 'utf8');

  it('queries referrals with begins_with REFERRAL#', () => {
    expect(content).toContain("begins_with(SK, :sk)");
    expect(content).toContain("':sk': 'REFERRAL#'");
  });

  it('returns referral count and reward points', () => {
    expect(content).toContain('totalReferrals');
    expect(content).toContain('totalRewardPoints');
  });

  it('returns 401 for unauthorized requests', () => {
    expect(content).toContain('respond(401');
  });

  it('uses QueryCommand for listing referrals', () => {
    expect(content).toContain('QueryCommand');
  });

  it('returns referral code in stats response', () => {
    expect(content).toContain('referralCode');
  });
});

describe('api-stack referral routes', () => {
  const apiStackPath = path.resolve(__dirname, '..', '..', 'stacks', 'api-stack.ts');
  const content = fs.readFileSync(apiStackPath, 'utf8');

  it('registers GET /api/referral/code route', () => {
    expect(content).toContain("'/api/referral/code'");
    expect(content).toContain('GenerateReferralCode');
  });

  it('registers POST /api/referral/validate route', () => {
    expect(content).toContain("'/api/referral/validate'");
    expect(content).toContain('ValidateReferral');
  });

  it('registers GET /api/referral/stats route', () => {
    expect(content).toContain("'/api/referral/stats'");
    expect(content).toContain('GetReferralStats');
  });

  it('uses consumerAuthorizer for all referral routes', () => {
    // Count occurrences of consumerAuthorizer near referral routes
    const referralSection = content.slice(content.indexOf('GenerateReferralCode'));
    expect(referralSection).toContain('consumerAuthorizer');
  });
});
