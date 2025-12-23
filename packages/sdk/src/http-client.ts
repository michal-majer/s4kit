// ============================================================================
// S4Kit HTTP Client - Stripe-Level Developer Experience
// ============================================================================

import ky, { type KyInstance, type Options as KyOptions, type HTTPError } from 'ky';
import type {
  S4KitConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  InterceptedRequest,
  InterceptedResponse,
  BatchOperation,
  BatchResult,
  Changeset,
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
  connection?: string;
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

  // ==========================================================================
  // Header Building
  // ==========================================================================

  private buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {};
    const conn = options?.connection || this.config.connection;
    const svc = options?.service || this.config.service;

    if (conn) headers['X-S4Kit-Connection'] = conn;
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
   * @example
   * ```ts
   * const results = await client.batch([
   *   { method: 'GET', entity: 'Products', id: 1 },
   *   { method: 'POST', entity: 'Products', data: { Name: 'New' } },
   *   { method: 'DELETE', entity: 'Products', id: 2 },
   * ]);
   * ```
   */
  async batch<T = any>(
    operations: BatchOperation<T>[],
    options?: RequestOptions
  ): Promise<BatchResult<T>[]> {
    const boundary = `batch_${generateUUID()}`;
    const body = this.buildBatchBody(operations, boundary);

    const headers = {
      ...this.buildHeaders(options),
      'Content-Type': `multipart/mixed; boundary=${boundary}`,
    };

    const response = await this.client.post('$batch', {
      body,
      headers,
    });

    return this.parseBatchResponse<T>(await response.text());
  }

  /**
   * Execute operations in an atomic changeset (all succeed or all fail)
   * @example
   * ```ts
   * const results = await client.changeset({
   *   operations: [
   *     { method: 'POST', entity: 'Orders', data: orderData },
   *     { method: 'POST', entity: 'OrderItems', data: itemData },
   *   ]
   * });
   * ```
   */
  async changeset<T = any>(
    changeset: Changeset,
    options?: RequestOptions
  ): Promise<BatchResult<T>[]> {
    const batchBoundary = `batch_${generateUUID()}`;
    const changesetBoundary = `changeset_${generateUUID()}`;

    const body = this.buildChangesetBody(changeset, batchBoundary, changesetBoundary);

    const headers = {
      ...this.buildHeaders(options),
      'Content-Type': `multipart/mixed; boundary=${batchBoundary}`,
    };

    const response = await this.client.post('$batch', {
      body,
      headers,
    });

    return this.parseBatchResponse<T>(await response.text());
  }

  private buildBatchBody(operations: BatchOperation[], boundary: string): string {
    const parts: string[] = [];

    for (const op of operations) {
      parts.push(`--${boundary}`);
      parts.push('Content-Type: application/http');
      parts.push('Content-Transfer-Encoding: binary');
      parts.push('');
      parts.push(this.buildBatchPart(op));
    }

    parts.push(`--${boundary}--`);
    return parts.join('\r\n');
  }

  private buildChangesetBody(
    changeset: Changeset,
    batchBoundary: string,
    changesetBoundary: string
  ): string {
    const parts: string[] = [];

    // Start batch
    parts.push(`--${batchBoundary}`);
    parts.push(`Content-Type: multipart/mixed; boundary=${changesetBoundary}`);
    parts.push('');

    // Changeset operations
    for (const op of changeset.operations) {
      parts.push(`--${changesetBoundary}`);
      parts.push('Content-Type: application/http');
      parts.push('Content-Transfer-Encoding: binary');
      parts.push('');
      parts.push(this.buildBatchPart(op));
    }

    parts.push(`--${changesetBoundary}--`);
    parts.push(`--${batchBoundary}--`);

    return parts.join('\r\n');
  }

  private buildBatchPart(op: BatchOperation): string {
    const lines: string[] = [];
    let path: string;

    switch (op.method) {
      case 'GET':
        path = op.id ? `${op.entity}(${this.formatKey(op.id)})` : op.entity;
        lines.push(`GET ${path} HTTP/1.1`);
        lines.push('Accept: application/json');
        break;

      case 'POST':
        lines.push(`POST ${op.entity} HTTP/1.1`);
        lines.push('Content-Type: application/json');
        lines.push('');
        lines.push(JSON.stringify(op.data));
        break;

      case 'PATCH':
      case 'PUT':
        path = `${op.entity}(${this.formatKey(op.id)})`;
        lines.push(`${op.method} ${path} HTTP/1.1`);
        lines.push('Content-Type: application/json');
        lines.push('');
        lines.push(JSON.stringify(op.data));
        break;

      case 'DELETE':
        path = `${op.entity}(${this.formatKey(op.id)})`;
        lines.push(`DELETE ${path} HTTP/1.1`);
        break;
    }

    return lines.join('\r\n');
  }

  private formatKey(key: string | number | Record<string, string | number>): string {
    if (typeof key === 'number') return String(key);
    if (typeof key === 'string') return `'${key}'`;
    return Object.entries(key)
      .map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`)
      .join(',');
  }

  private parseBatchResponse<T>(responseText: string): BatchResult<T>[] {
    // Simplified batch response parsing
    // In production, this would need more robust parsing
    const results: BatchResult<T>[] = [];
    const parts = responseText.split(/--batch_[a-f0-9-]+/);

    for (const part of parts) {
      if (!part.trim() || part.trim() === '--') continue;

      const statusMatch = part.match(/HTTP\/1\.1 (\d+)/);
      if (!statusMatch || !statusMatch[1]) continue;

      const status = parseInt(statusMatch[1], 10);
      const jsonMatch = part.match(/\{[\s\S]*\}/);

      if (status >= 200 && status < 300) {
        results.push({
          success: true,
          status,
          data: jsonMatch ? JSON.parse(jsonMatch[0]) : undefined,
        });
      } else {
        results.push({
          success: false,
          status,
          error: jsonMatch
            ? { code: 'BATCH_ERROR', message: JSON.parse(jsonMatch[0])?.error?.message ?? 'Unknown error' }
            : { code: 'BATCH_ERROR', message: 'Unknown error' },
        });
      }
    }

    return results;
  }
}
