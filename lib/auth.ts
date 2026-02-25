import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  ISignUpResult,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole = 'consumer' | 'business';

// ---------------------------------------------------------------------------
// Pool singletons
// ---------------------------------------------------------------------------

const POOL_ID = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '';
const CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';

if (!POOL_ID || !CLIENT_ID) {
  console.warn(
    'Missing Cognito env vars: EXPO_PUBLIC_COGNITO_USER_POOL_ID and EXPO_PUBLIC_COGNITO_CLIENT_ID. Auth will not work.',
  );
}

export const businessPool = new CognitoUserPool({
  UserPoolId: POOL_ID || 'placeholder',
  ClientId: CLIENT_ID,
});

const CONSUMER_POOL_ID = process.env.EXPO_PUBLIC_CONSUMER_POOL_ID ?? '';
const CONSUMER_CLIENT_ID = process.env.EXPO_PUBLIC_CONSUMER_CLIENT_ID ?? '';

if (!CONSUMER_POOL_ID || !CONSUMER_CLIENT_ID) {
  console.warn(
    'Missing Cognito env vars: EXPO_PUBLIC_CONSUMER_POOL_ID and EXPO_PUBLIC_CONSUMER_CLIENT_ID. Consumer auth will not work.',
  );
}

if (CONSUMER_POOL_ID.includes('PLACEHOLDER') || CONSUMER_CLIENT_ID.includes('placeholder')) {
  throw new Error(
    'Consumer Cognito pool is not configured. EXPO_PUBLIC_CONSUMER_POOL_ID or EXPO_PUBLIC_CONSUMER_CLIENT_ID contains a placeholder value. ' +
    'Run `./scripts/sync-env.sh [stage]` after deploying the Auth stack to populate real values.',
  );
}

export const consumerPool = new CognitoUserPool({
  UserPoolId: CONSUMER_POOL_ID || 'placeholder',
  ClientId: CONSUMER_CLIENT_ID,
});

/** @deprecated Use businessPool or consumerPool directly. Kept for backward compatibility. */
export const userPool = businessPool;

// ---------------------------------------------------------------------------
// Secure-store key
// ---------------------------------------------------------------------------

const REFRESH_TOKEN_KEY = 'neardeal_refresh_token';
const USER_ROLE_KEY = 'neardeal_user_role';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export interface SignUpAttributes {
  businessName: string;
  ownerName: string;
  category: string;
  address: string;
  city: string;
  district: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCognitoUser(email: string, pool: CognitoUserPool = businessPool): CognitoUser {
  return new CognitoUser({ Username: email, Pool: pool });
}

function extractError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return new Error((err as { message: string }).message);
  }
  return new Error('An unknown authentication error occurred.');
}

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

export async function signUp(
  email: string,
  password: string,
  attributes: SignUpAttributes,
): Promise<ISignUpResult> {
  const attributeList: CognitoUserAttribute[] = [
    new CognitoUserAttribute({ Name: 'email', Value: email }),
    new CognitoUserAttribute({ Name: 'name', Value: attributes.ownerName }),
    new CognitoUserAttribute({
      Name: 'custom:businessName',
      Value: attributes.businessName,
    }),
    new CognitoUserAttribute({
      Name: 'custom:ownerName',
      Value: attributes.ownerName,
    }),
    new CognitoUserAttribute({
      Name: 'custom:category',
      Value: attributes.category,
    }),
    new CognitoUserAttribute({
      Name: 'custom:address',
      Value: attributes.address,
    }),
    new CognitoUserAttribute({ Name: 'custom:city', Value: attributes.city }),
    new CognitoUserAttribute({
      Name: 'custom:district',
      Value: attributes.district,
    }),
  ];

  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) return reject(extractError(err));
      if (!result) return reject(new Error('Sign-up returned no result.'));
      resolve(result);
    });
  });
}

// ---------------------------------------------------------------------------
// confirmSignUp
// ---------------------------------------------------------------------------

export async function confirmSignUp(
  email: string,
  code: string,
  role: UserRole = 'business',
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = role === 'consumer' ? consumerPool : businessPool;
    const cognitoUser = makeCognitoUser(email, pool);
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) return reject(extractError(err));
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

export async function signIn(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });
  const cognitoUser = makeCognitoUser(email);

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: async (session: CognitoUserSession) => {
        const tokens = extractTokens(session);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
        await SecureStore.setItemAsync(USER_ROLE_KEY, 'business');
        resolve(tokens);
      },
      onFailure: (err) => reject(extractError(err)),
      newPasswordRequired: () => {
        reject(
          new Error(
            'A new password is required. Please contact support or use the reset password flow.',
          ),
        );
      },
    });
  });
}

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const role = await getStoredUserRole();
  const pool = role === 'consumer' ? consumerPool : businessPool;
  return new Promise((resolve, reject) => {
    const cognitoUser = pool.getCurrentUser();
    if (!cognitoUser) {
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
      SecureStore.deleteItemAsync(USER_ROLE_KEY).catch(() => null);
      return resolve();
    }

    cognitoUser.globalSignOut({
      onSuccess: async () => {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
        await SecureStore.deleteItemAsync(USER_ROLE_KEY).catch(() => null);
        resolve();
      },
      onFailure: (err) => {
        // Still clear local tokens even if global sign-out fails.
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
        SecureStore.deleteItemAsync(USER_ROLE_KEY).catch(() => null);
        reject(extractError(err));
      },
    });
  });
}

// ---------------------------------------------------------------------------
// forgotPassword
// ---------------------------------------------------------------------------

export async function forgotPassword(email: string, role: UserRole = 'business'): Promise<void> {
  const pool = role === 'consumer' ? consumerPool : businessPool;
  return new Promise((resolve, reject) => {
    const cognitoUser = makeCognitoUser(email, pool);
    cognitoUser.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(extractError(err)),
    });
  });
}

// ---------------------------------------------------------------------------
// confirmForgotPassword
// ---------------------------------------------------------------------------

export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
  role: UserRole = 'business',
): Promise<void> {
  const pool = role === 'consumer' ? consumerPool : businessPool;
  return new Promise((resolve, reject) => {
    const cognitoUser = makeCognitoUser(email, pool);
    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(extractError(err)),
    });
  });
}

// ---------------------------------------------------------------------------
// refreshSession
// ---------------------------------------------------------------------------

export async function refreshSession(): Promise<AuthTokens> {
  const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!storedRefreshToken) {
    throw new Error('No refresh token found. Please sign in again.');
  }

  const role = await getStoredUserRole();
  const pool = role === 'consumer' ? consumerPool : businessPool;
  const cognitoUser = pool.getCurrentUser();
  if (!cognitoUser) {
    throw new Error('No current Cognito user found. Please sign in again.');
  }

  return new Promise((resolve, reject) => {
    cognitoUser.getSession(
      async (err: Error | null, session: CognitoUserSession | null) => {
        if (err) return reject(extractError(err));
        if (!session || !session.isValid()) {
          return reject(
            new Error('Session is invalid. Please sign in again.'),
          );
        }
        const tokens = extractTokens(session);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
        resolve(tokens);
      },
    );
  });
}

// ---------------------------------------------------------------------------
// getCurrentSession
// ---------------------------------------------------------------------------

export async function getCurrentSession(): Promise<AuthTokens> {
  const role = await getStoredUserRole();
  const pool = role === 'consumer' ? consumerPool : businessPool;
  const cognitoUser = pool.getCurrentUser();
  if (!cognitoUser) {
    throw new Error('No authenticated user. Please sign in.');
  }

  return new Promise((resolve, reject) => {
    cognitoUser.getSession(
      async (err: Error | null, session: CognitoUserSession | null) => {
        if (err) return reject(extractError(err));
        if (!session || !session.isValid()) {
          return reject(new Error('Session is invalid. Please sign in again.'));
        }
        const tokens = extractTokens(session);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
        resolve(tokens);
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Consumer sign-up
// ---------------------------------------------------------------------------

export async function consumerSignUp(
  email: string,
  password: string,
  name: string,
): Promise<ISignUpResult> {
  const attributeList: CognitoUserAttribute[] = [
    new CognitoUserAttribute({ Name: 'email', Value: email }),
    new CognitoUserAttribute({ Name: 'name', Value: name }),
  ];

  return new Promise((resolve, reject) => {
    consumerPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) return reject(extractError(err));
      if (!result) return reject(new Error('Sign-up returned no result.'));
      resolve(result);
    });
  });
}

// ---------------------------------------------------------------------------
// Consumer sign-in
// ---------------------------------------------------------------------------

export async function consumerSignIn(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });
  const cognitoUser = makeCognitoUser(email, consumerPool);

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: async (session: CognitoUserSession) => {
        const tokens = extractTokens(session);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
        await SecureStore.setItemAsync(USER_ROLE_KEY, 'consumer');
        resolve(tokens);
      },
      onFailure: (err) => reject(extractError(err)),
      newPasswordRequired: () => {
        reject(
          new Error(
            'A new password is required. Please contact support or use the reset password flow.',
          ),
        );
      },
    });
  });
}

// ---------------------------------------------------------------------------
// User role helpers
// ---------------------------------------------------------------------------

export async function getStoredUserRole(): Promise<UserRole | null> {
  const role = await SecureStore.getItemAsync(USER_ROLE_KEY);
  if (role === 'consumer' || role === 'business') return role;
  return null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractTokens(session: CognitoUserSession): AuthTokens {
  return {
    accessToken: session.getAccessToken().getJwtToken(),
    idToken: session.getIdToken().getJwtToken(),
    refreshToken: session.getRefreshToken().getToken(),
  };
}
