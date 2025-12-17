import ky from 'ky';
import type { S4KitConfig } from './types';

export interface RequestOptions {
  connection?: string;
  service?: string;
}

export class HttpClient {
  private client: typeof ky;
  private defaultConnection?: string;
  private defaultService?: string;

  constructor(config: S4KitConfig) {
    this.defaultConnection = config.connection;
    this.defaultService = config.service;
    
    this.client = ky.create({
      prefixUrl: config.baseUrl || 'https://api.s4kit.com/api/proxy',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {};
    const conn = options?.connection || this.defaultConnection;
    const svc = options?.service || this.defaultService;
    
    if (conn) headers['X-S4Kit-Connection'] = conn;
    if (svc) headers['X-S4Kit-Service'] = svc;
    
    return headers;
  }

  async get<T>(path: string, searchParams?: Record<string, any>, options?: RequestOptions): Promise<T> {
    return this.client.get(path, { searchParams, headers: this.buildHeaders(options) }).json();
  }

  async post<T>(path: string, json: any, options?: RequestOptions): Promise<T> {
    return this.client.post(path, { json, headers: this.buildHeaders(options) }).json();
  }

  async patch<T>(path: string, json: any, options?: RequestOptions): Promise<T> {
    return this.client.patch(path, { json, headers: this.buildHeaders(options) }).json();
  }

  async delete(path: string, options?: RequestOptions): Promise<void> {
    await this.client.delete(path, { headers: this.buildHeaders(options) });
  }
}
