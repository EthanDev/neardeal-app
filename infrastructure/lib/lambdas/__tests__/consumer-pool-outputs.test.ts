import * as fs from 'fs';
import * as path from 'path';

const AUTH_STACK_PATH = path.resolve(__dirname, '..', '..', 'stacks', 'auth-stack.ts');
const SYNC_ENV_SCRIPT_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'neardeal-business', 'scripts', 'sync-env.sh');
const AUTH_LIB_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'neardeal-business', 'lib', 'auth.ts');

describe('Consumer Cognito pool outputs', () => {
  const authStackContent = fs.readFileSync(AUTH_STACK_PATH, 'utf-8');

  test('auth-stack exports ConsumerUserPoolId as a CfnOutput', () => {
    expect(authStackContent).toContain("new cdk.CfnOutput(this, 'ConsumerUserPoolId'");
  });

  test('auth-stack exports ConsumerUserPoolClientId as a CfnOutput', () => {
    expect(authStackContent).toContain("new cdk.CfnOutput(this, 'ConsumerUserPoolClientId'");
  });

  test('CfnOutput for ConsumerUserPoolId uses the actual pool resource', () => {
    expect(authStackContent).toMatch(/CfnOutput\(this,\s*'ConsumerUserPoolId'[\s\S]*?consumerUserPool\.userPoolId/);
  });

  test('CfnOutput for ConsumerUserPoolClientId uses the actual client resource', () => {
    expect(authStackContent).toMatch(/CfnOutput\(this,\s*'ConsumerUserPoolClientId'[\s\S]*?consumerUserPoolClient\.userPoolClientId/);
  });

  test('sync-env.sh script exists', () => {
    expect(fs.existsSync(SYNC_ENV_SCRIPT_PATH)).toBe(true);
  });

  test('sync-env.sh fetches consumer pool values from CloudFormation', () => {
    const script = fs.readFileSync(SYNC_ENV_SCRIPT_PATH, 'utf-8');
    expect(script).toContain('describe-stacks');
    expect(script).toContain('ConsumerUserPoolId');
    expect(script).toContain('ConsumerUserPoolClientId');
    expect(script).toContain('EXPO_PUBLIC_CONSUMER_POOL_ID');
    expect(script).toContain('EXPO_PUBLIC_CONSUMER_CLIENT_ID');
  });

  test('auth.ts throws an error if consumer pool ID contains PLACEHOLDER', () => {
    const authContent = fs.readFileSync(AUTH_LIB_PATH, 'utf-8');
    expect(authContent).toContain('PLACEHOLDER');
    expect(authContent).toMatch(/throw\s+new\s+Error/);
  });
});
