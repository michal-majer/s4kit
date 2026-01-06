// ============================================================================
// S4Kit HTTP Client - Stripe-Level Developer Experience
// ============================================================================

import ky, { type KyInstance, type Options as KyOptions, type HTTPError } from 'ky';
import type {
  S4KitConfig,
  InstanceEnvironment,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  InterceptedRequest,
  InterceptedResponse,
  BatchOperation,
  BatchResult,
} from './types';
import {
  S4KitError,
  NetworkError,
  TimeoutError,
  parseHttpError,
} from './errors';

// Simple UUID generator (works in all environments)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// Request/Response Options
// ============================================================================

export interface RequestOptions {
  connection?: InstanceEnvironment;
  service?: string;
  raw?: boolean;
  headers?: Record<string, string>;
}

export interface HttpClientConfig extends S4KitConfig {
  onRequest?: RequestInterceptor[];
  onResponse?: ResponseInterceptor[];
  onError?: ErrorInterceptor[];
}

// ============================================================================
// HTTP Client
// ============================================================================

export class HttpClient {
  private client: KyInstance;
  private config: HttpClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private debug: boolean;

  constructor(config: HttpClientConfig) {
    this.config = config;
    this.debug = config.debug ?? false;

    // Initialize interceptors
    if (config.onRequest) this.requestInterceptors = [...config.onRequest];
    if (config.onResponse) this.responseInterceptors = [...config.onResponse];
    if (config.onError) this.errorInterceptors = [...config.onError];

    this.client = ky.create({
      prefixUrl: config.baseUrl || 'https://api.s4kit.com/api/proxy',
      timeout: config.timeout ?? 30000,
      retry: config.retries ?? 0,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      hooks: {
        beforeError: [
          async (error: HTTPError) => {
            // Transform ky errors into S4KitError
            const request: InterceptedRequest = {
              url: error.request?.url ?? '',
              method: error.request?.method ?? 'UNKNOWN',
              headers: Object.fromEntries(error.request?.headers?.entries() ?? []),
            };

            let s4kitError: S4KitError;

            if (error.name === 'TimeoutError') {
              s4kitError = new TimeoutError(this.config.timeout ?? 30000, { request });
            } else if (error.response) {
              const body = await error.response.json().catch(() => ({}));
              s4kitError = parseHttpError(error.response.status, body, request);
            } else {
              s4kitError = new NetworkError(error.message, { cause: error, request });
            }

            // Run error interceptors
            let finalError: S4KitError = s4kitError;
            for (const interceptor of this.errorInterceptors) {
              const result = await interceptor(finalError);
              if (result instanceof S4KitError) {
                finalError = result;
              }
            }

            throw finalError;
          }
        ],
      },
    });
  }

  // ==========================================================================
  // Interceptor Management
  // ==========================================================================

  /**
   * Add a request interceptor
   * @example
   * ```ts
   * client.onRequest((req) => {
   *   console.log(`${req.method} ${req.url}`);
   *   return req;
   * });
   * ```
   */
  onRequest(interceptor: RequestInterceptor): this {
    this.requestInterceptors.push(interceptor);
    return this;
  }

  /**
   * Add a response interceptor
   * @example
   * ```ts
   * client.onResponse((res) => {
   *   console.log(`Response: ${res.status}`);
   *   return res;
   * });
   * ```
   */
  onResponse(interceptor: ResponseInterceptor): this {
    this.responseInterceptors.push(interceptor);
    return this;
  }

  /**
   * Add an error interceptor
   * @example
   * ```ts
   * client.onError((err) => {
   *   if (err.status === 401) {
   *     // Refresh token logic
   *   }
   *   return err;
   * });
   * ```
   */
  onError(interceptor: ErrorInterceptor): this {
    this.errorInterceptors.push(interceptor);
    return this;
  }

  // ==========================================================================
  // Debug Logging
  // ==========================================================================

  /**
   * Check if debug mode is enabled
   */
  get isDebug(): boolean {
    return this.debug;
  }

  private log(message: string, data?: any): void {
    if (!this.debug) return;
    const timestamp = new Date().toISOString();
    const prefix = `[s4kit ${timestamp}]`;
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  /**
   * Log a warning if debug mode is enabled
   */
  warn(message: string): void {
    if (!this.debug) return;
    const timestamp = new Date().toISOString();
    console.warn(`[s4kit ${timestamp}]`, message);
  }

  // ==========================================================================
  // Header Building
  // ==========================================================================

  private buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {};
    const instance = options?.connection || this.config.connection;
    const svc = options?.service || this.config.service;

    if (instance) headers['X-S4Kit-Instance'] = instance;
    if (svc) headers['X-S4Kit-Service'] = svc;
    if (options?.raw) headers['X-S4Kit-Raw'] = 'true';

    // Merge custom headers
    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    return headers;
  }

  // ==========================================================================
  // Request Execution
  // ==========================================================================

  private async executeRequest<T>(
    method: string,
    path: string,
    options: KyOptions & { json?: any } = {},
    requestOptions?: RequestOptions
  ): Promise<T> {
    const startTime = Date.now();
    const headers = this.buildHeaders(requestOptions);

    // Build intercepted request object
    let request: InterceptedRequest = {
      url: path,
      method,
      headers: { ...headers },
      body: options.json,
      searchParams: options.searchParams as Record<string, string>,
    };

    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      request = await interceptor(request);
    }

    this.log(`→ ${method} ${path}`, request.searchParams ? `?${new URLSearchParams(request.searchParams)}` : '');
    if (request.body) {
      this.log('  Body:', request.body);
    }

    // Execute request
    const response = await this.client(request.url, {
      method: request.method,
      headers: request.headers,
      json: request.body,
      searchParams: request.searchParams,
    });

    const duration = Date.now() - startTime;

    // Parse response
    const data = await response.json() as T;

    this.log(`← ${response.status} (${duration}ms)`);
    if (this.debug && data) {
      const preview = JSON.stringify(data).slice(0, 200);
      this.log('  Data:', preview + (preview.length >= 200 ? '...' : ''));
    }

    // Build intercepted response object
    let interceptedResponse: InterceptedResponse = {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    };

    // Run response interceptors
    for (const interceptor of this.responseInterceptors) {
      interceptedResponse = await interceptor(interceptedResponse);
    }

    return interceptedResponse.data;
  }

  // ==========================================================================
  // HTTP Methods
  // ==========================================================================

  async get<T>(
    path: string,
    searchParams?: Record<string, any>,
    options?: RequestOptions
  ): Promise<T> {
    return this.executeRequest<T>('GET', path, { searchParams }, options);
  }

  async post<T>(
    path: string,
    json: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.executeRequest<T>('POST', path, { json }, options);
  }

  async put<T>(
    path: string,
    json: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.executeRequest<T>('PUT', path, { json }, options);
  }

  async patch<T>(
    path: string,
    json: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.executeRequest<T>('PATCH', path, { json }, options);
  }

  async delete(
    path: string,
    options?: RequestOptions
  ): Promise<void> {
    await this.executeRequest<void>('DELETE', path, {}, options);
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Execute multiple operations in a single batch request
   * Uses the new JSON batch format
   * @example
   * ```ts
   * const results = await client.batchRequest([
   *   { method: 'POST', entity: 'Books', data: { title: 'Book 1' } },
   *   { method: 'DELETE', entity: 'Books', id: 123 },
   * ]);
   * ```
   */
  async batchRequest<T = unknown>(
    operations: BatchOperation[],
    options?: RequestOptions & { atomic?: boolean }
  ): Promise<BatchResult<T>[]> {
    const headers = this.buildHeaders(options);

    this.log(`→ POST batch (${operations.length} operations, atomic: ${options?.atomic ?? false})`);

    const response = await this.client.post('batch', {
      json: {
        atomic: options?.atomic ?? false,
        operations,
      },
      headers,
    });

    const results = await response.json() as BatchResult<T>[];

    this.log(`← batch: ${results.filter(r => r.success).length}/${results.length} succeeded`);

    return results;
  }
}
