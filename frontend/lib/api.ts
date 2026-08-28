/**
 * Fetch-based API client for the Policy Change Impact Engine backend.
 *
 * Base URL is configured via NEXT_PUBLIC_API_URL environment variable.
 * Defaults to http://localhost:3001 for local development.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const documents = await api.get('/documents');
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

  const headers: HeadersInit = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
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
