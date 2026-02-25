import { useAuthStore } from './store';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

if (!BASE_URL) {
  console.warn('EXPO_PUBLIC_API_URL is not set. API calls will fail.');
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
        ? (body as { message: string }).message
        : `Request failed with status ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface FetchOptions {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  /** If true, skip the 401 retry logic (used internally to avoid infinite loops). */
  _isRetry?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, _isRetry = false } = options;

  const { idToken, refreshSession } = useAuthStore.getState();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (idToken) {
    requestHeaders['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // -------------------------------------------------------------------------
  // 401 handling – attempt one silent token refresh then retry.
  // -------------------------------------------------------------------------
  if (response.status === 401 && !_isRetry) {
    try {
      await refreshSession();
    } catch {
      // refreshSession already resets auth state; just propagate.
      throw new ApiError(401, { message: 'Unauthorized. Please sign in again.' });
    }
    return apiFetch<T>(path, { ...options, _isRetry: true });
  }

  // -------------------------------------------------------------------------
  // Parse response body.
  // -------------------------------------------------------------------------
  let responseBody: unknown;
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    responseBody = await response.json();
  } else {
    const text = await response.text();
    responseBody = text || null;
  }

  if (!response.ok) {
    throw new ApiError(response.status, responseBody);
  }

  return responseBody as T;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export const api = {
  get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return apiFetch<T>(path, { method: 'GET', headers });
  },

  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return apiFetch<T>(path, { method: 'POST', body, headers });
  },

  put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return apiFetch<T>(path, { method: 'PUT', body, headers });
  },

  patch<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return apiFetch<T>(path, { method: 'PATCH', body, headers });
  },

  delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return apiFetch<T>(path, { method: 'DELETE', headers });
  },
};
