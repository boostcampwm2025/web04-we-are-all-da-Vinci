import * as Sentry from '@sentry/react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

interface FetchOptions<TBody = unknown> {
  body?: TBody;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export const fetchClient = async <TResponse, TBody = unknown>(
  endpoint: string,
  options?: FetchOptions<TBody>,
): Promise<TResponse> => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: options?.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = new HttpError(
        `HTTP error! status: ${response.status}`,
        response.status,
      );

      Sentry.captureException(error, {
        tags: {
          error_type: 'http_error',
          status_code: response.status,
        },
        level: 'error',
        extra: {
          endpoint,
        },
      });

      throw error;
    }

    return response.json();
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    Sentry.captureException(error, {
      tags: {
        error_type: 'fetch_error',
      },
      level: 'error',
    });

    throw error;
  }
};
