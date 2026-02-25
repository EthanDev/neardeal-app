import { useState, useCallback } from 'react';
import { useAuthStore } from '../lib/store';
import {
  confirmSignUp,
  forgotPassword,
  confirmForgotPassword,
  consumerSignUp as authConsumerSignUp,
  type SignUpAttributes,
} from '../lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Operation =
  | 'login'
  | 'signup'
  | 'consumerLogin'
  | 'consumerSignup'
  | 'confirmSignUp'
  | 'logout'
  | 'sendResetCode'
  | 'confirmReset'
  | null;

interface AuthHook {
  // State
  user: ReturnType<typeof useAuthStore.getState>['user'];
  isAuthenticated: boolean;
  isLoading: boolean;
  /** The current active operation, useful for per-button loading indicators. */
  activeOperation: Operation;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (
    email: string,
    password: string,
    attributes: SignUpAttributes,
  ) => Promise<boolean>;
  consumerLogin: (email: string, password: string) => Promise<boolean>;
  consumerSignup: (email: string, password: string, name: string) => Promise<boolean>;
  confirmEmail: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  sendResetCode: (email: string) => Promise<boolean>;
  confirmReset: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<boolean>;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthHook {
  const {
    user,
    isAuthenticated,
    login: storeLogin,
    signup: storeSignup,
    consumerLogin: storeConsumerLogin,
    consumerSignup: storeConsumerSignup,
    logout: storeLogout,
  } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [activeOperation, setActiveOperation] = useState<Operation>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /** Wraps an async operation with shared loading/error management. */
  async function run<T>(
    operation: NonNullable<Operation>,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    setIsLoading(true);
    setActiveOperation(operation);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  }

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const result = await run('login', () => storeLogin(email, password));
      return result !== null;
    },
    [storeLogin],
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      attributes: SignUpAttributes,
    ): Promise<boolean> => {
      const result = await run('signup', () =>
        storeSignup(email, password, attributes),
      );
      return result !== null;
    },
    [storeSignup],
  );

  const consumerLogin = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const result = await run('consumerLogin', () => storeConsumerLogin(email, password));
      return result !== null;
    },
    [storeConsumerLogin],
  );

  const consumerSignup = useCallback(
    async (email: string, password: string, name: string): Promise<boolean> => {
      const result = await run('consumerSignup', () =>
        storeConsumerSignup(email, password, name),
      );
      return result !== null;
    },
    [storeConsumerSignup],
  );

  const confirmEmail = useCallback(
    async (email: string, code: string): Promise<boolean> => {
      const result = await run('confirmSignUp', () =>
        confirmSignUp(email, code),
      );
      return result !== null;
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await run('logout', () => storeLogout());
  }, [storeLogout]);

  const sendResetCode = useCallback(
    async (email: string): Promise<boolean> => {
      const result = await run('sendResetCode', () => forgotPassword(email));
      return result !== null;
    },
    [],
  );

  const confirmReset = useCallback(
    async (
      email: string,
      code: string,
      newPassword: string,
    ): Promise<boolean> => {
      const result = await run('confirmReset', () =>
        confirmForgotPassword(email, code, newPassword),
      );
      return result !== null;
    },
    [],
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    activeOperation,
    error,
    login,
    signup,
    consumerLogin,
    consumerSignup,
    confirmEmail,
    logout,
    sendResetCode,
    confirmReset,
    clearError,
  };
}
