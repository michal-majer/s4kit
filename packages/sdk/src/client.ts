import { HttpClient } from './http-client';
import { createProxy } from './proxy';
import type { S4KitConfig } from './types';

export class S4Kit {
  private httpClient: HttpClient;
  public sap: any; // The proxy object

  constructor(config: S4KitConfig) {
    this.httpClient = new HttpClient(config);
    this.sap = createProxy(this.httpClient);
  }
}
