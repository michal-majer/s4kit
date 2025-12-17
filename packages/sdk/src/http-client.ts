import ky from 'ky';
import type { S4KitConfig } from './types';

export class HttpClient {
  private client: typeof ky;

  constructor(config: S4KitConfig) {
    this.client = ky.create({
      prefixUrl: config.baseUrl || 'https://api.s4kit.com',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async get<T>(path: string, searchParams?: Record<string, any>): Promise<T> {
    return this.client.get(path, { searchParams }).json();
  }

  async post<T>(path: string, json: any): Promise<T> {
    return this.client.post(path, { json }).json();
  }

  async patch<T>(path: string, json: any): Promise<T> {
    return this.client.patch(path, { json }).json();
  }

  async delete(path: string): Promise<void> {
    await this.client.delete(path);
  }
}
