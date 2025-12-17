import { HttpClient } from './http-client';
import { buildQuery } from './query-builder';
import type { EntityHandler, QueryOptions } from './types';

function formatId(id: string | number): string {
  if (typeof id === 'number') {
    return String(id);
  }
  return `'${id}'`;
}

export function createProxy(client: HttpClient) {
  return new Proxy({}, {
    get: (_target, entityName: string) => {
      // Hardcoded simplified OData path assumption for now
      // Real implementation might map entityName to specific endpoints
      const basePath = entityName; 

      const handler: EntityHandler = {
        list: (options?: QueryOptions) => client.get(basePath, buildQuery(options)),
        get: (id: string | number, options?: QueryOptions) => client.get(`${basePath}(${formatId(id)})`, buildQuery(options)),
        create: (data: any) => client.post(basePath, data),
        update: (id: string | number, data: any) => client.patch(`${basePath}(${formatId(id)})`, data),
        delete: (id: string | number) => client.delete(`${basePath}(${formatId(id)})`),
      };

      return handler;
    }
  });
}
