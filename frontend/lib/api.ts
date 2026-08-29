/**
 * Fetch-based API client for the Policy Change Impact Engine backend.
 * Automatically injects JWT Bearer authentication and handles API errors.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const TOKEN_KEY = 'pcie_auth_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const errJson = await response.json();
      if (Array.isArray(errJson.message)) {
        errorMsg = errJson.message.join(', ');
      } else if (errJson.message) {
        errorMsg = errJson.message;
      } else {
        errorMsg = JSON.stringify(errJson);
      }
    } catch {
      errorMsg = await response.text().catch(() => response.statusText);
    }

    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      // Clear invalid/expired token and notify
      setAuthToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    throw new ApiError(response.status, errorMsg || 'An unknown network error occurred');
  }

  // 204 No Content — return undefined
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  upload: <T>(path: string, formData: FormData, options?: RequestInit) =>
    request<T>(path, {
      method: 'POST',
      body: formData,
      ...options,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'DELETE', ...options }),
};

export { ApiError };
