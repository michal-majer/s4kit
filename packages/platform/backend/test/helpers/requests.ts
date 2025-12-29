/**
 * HTTP request helpers for S4Kit backend tests
 *
 * Wraps the Hono app.request() method for convenient test requests.
 */

import app from './test-app';

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
}

export interface RequestResult<T = unknown> {
  response: Response;
  status: number;
  data: T;
}

/**
 * Make a request to the Hono app
 */
async function request<T = unknown>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<RequestResult<T>> {
  const response = await app.request(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: T;
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    data = await response.json() as T;
  } else {
    data = await response.text() as unknown as T;
  }

  return {
    response,
    status: response.status,
    data,
  };
}

/**
 * GET request
 */
export function get<T = unknown>(path: string, options?: RequestOptions): Promise<RequestResult<T>> {
  return request<T>('GET', path, options);
}

/**
 * POST request
 */
export function post<T = unknown>(path: string, options?: RequestOptions): Promise<RequestResult<T>> {
  return request<T>('POST', path, options);
}

/**
 * PATCH request
 */
export function patch<T = unknown>(path: string, options?: RequestOptions): Promise<RequestResult<T>> {
  return request<T>('PATCH', path, options);
}

/**
 * PUT request
 */
export function put<T = unknown>(path: string, options?: RequestOptions): Promise<RequestResult<T>> {
  return request<T>('PUT', path, options);
}

/**
 * DELETE request
 */
export function del<T = unknown>(path: string, options?: RequestOptions): Promise<RequestResult<T>> {
  return request<T>('DELETE', path, options);
}

/**
 * Assert successful response (2xx status code)
 */
export function expectSuccess<T>(result: RequestResult<T>): void {
  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `Expected success status but got ${result.status}: ${JSON.stringify(result.data)}`
    );
  }
}

/**
 * Assert error response with specific status
 */
export function expectError<T>(result: RequestResult<T>, expectedStatus: number): void {
  if (result.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${result.status}: ${JSON.stringify(result.data)}`
    );
  }
}
