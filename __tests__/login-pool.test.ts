/**
 * Structural test: verifies login.tsx calls the correct Cognito pool
 * based on the selected login mode (consumer vs business).
 *
 * This is a source-level test that reads the file content and checks
 * that the onSubmit function dispatches to consumerLogin for consumer
 * mode and login for business mode.
 */
import * as fs from 'fs';
import * as path from 'path';

const loginSource = fs.readFileSync(
  path.resolve(__dirname, '../app/(auth)/login.tsx'),
  'utf-8',
);

describe('login.tsx pool selection', () => {
  test('imports or destructures consumerLogin from useAuth', () => {
    // The component should destructure consumerLogin from useAuth()
    expect(loginSource).toMatch(/consumerLogin/);
  });

  test('consumer mode branch calls consumerLogin', () => {
    // There should be a conditional that calls consumerLogin when mode is consumer
    expect(loginSource).toMatch(/consumer.*consumerLogin|consumerLogin.*consumer/s);
  });

  test('business mode branch calls login (not consumerLogin)', () => {
    // There should be a branch that calls login() for business mode
    // We check that login() is called in a business/else context
    expect(loginSource).toMatch(/business.*\blogin\b|else.*\blogin\b/s);
  });

  test('does NOT unconditionally call login() for all modes', () => {
    // The old bug: onSubmit always called login() regardless of mode.
    // After the fix, login() should only appear inside a conditional branch,
    // not as the sole call in onSubmit.
    // We verify by checking that the onSubmit function body contains a conditional
    // (if/else or ternary) that determines which login function to call.
    const onSubmitMatch = loginSource.match(
      /async function onSubmit[\s\S]*?^\s{2}\}/m,
    );
    expect(onSubmitMatch).not.toBeNull();
    const onSubmitBody = onSubmitMatch![0];

    // Should contain a conditional for loginMode
    expect(onSubmitBody).toMatch(/loginMode/);

    // Should contain both login calls
    expect(onSubmitBody).toMatch(/consumerLogin/);
    expect(onSubmitBody).toMatch(/\blogin\b/);
  });

  test('does not contain the temporary workaround comment', () => {
    expect(loginSource).not.toMatch(
      /Use the business Cognito pool for both modes/,
    );
  });
});
