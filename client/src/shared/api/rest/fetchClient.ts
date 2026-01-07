const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface FetchOptions<TBody = unknown> {
  body?: TBody;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export const fetchClient = async <TResponse, TBody = unknown>(
  endpoint: string,
  options?: FetchOptions<TBody>,
): Promise<TResponse> => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
