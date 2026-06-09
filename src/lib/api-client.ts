/** Shared fetch helpers for client-side API calls. */

import { ensureAuthReady } from '@/lib/auth-session';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: ({ error?: string } & Record<string, unknown>) | null = null;

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(`Server error (${response.status})`, response.status);
  }

  if (!response.ok) {
    const message =
      (body && typeof body.error === 'string' && body.error) ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  return parseJsonResponse<T>(response);
}

export async function postAuthedApi<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  await ensureAuthReady();
  const { getAuthHeaders } = await import('@/lib/auth-session');
  const authHeaders = await getAuthHeaders();

  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse<T>(response);
}

export async function patchAuthedApi<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  await ensureAuthReady();
  const { getAuthHeaders } = await import('@/lib/auth-session');
  const authHeaders = await getAuthHeaders();

  const response = await fetch(path, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse<T>(response);
}
