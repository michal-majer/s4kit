import { HttpClient, type RequestOptions } from './http-client';
import { buildQuery } from './query-builder';
import type { EntityHandler, QueryOptions } from './types';

function formatId(id: string | number): string {
  if (typeof id === 'number') {
    return String(id);
  }
  return `'${id}'`;
}

/**
 * Extract connection/service options from QueryOptions for passing to HttpClient
 */
function extractRequestOptions(options?: QueryOptions): RequestOptions | undefined {
  if (!options) return undefined;
  const { connection, service } = options;
  if (!connection && !service) return undefined;
  return { connection, service };
}

export function createProxy(client: HttpClient) {
  return new Proxy({}, {
    get: (_target, entityName: string) => {
      // Entity name becomes the path - platform will resolve to correct service
      const basePath = entityName; 

      const handler: EntityHandler<any> = {
        list: (options?: QueryOptions<any>) => 
          client.get(basePath, buildQuery(options as any), extractRequestOptions(options)),
        get: (id: string | number, options?: QueryOptions<any>) => 
          client.get(`${basePath}(${formatId(id)})`, buildQuery(options as any), extractRequestOptions(options)),
        create: (data: any, options?: QueryOptions<any>) => 
          client.post(basePath, data, extractRequestOptions(options)),
        update: (id: string | number, data: any, options?: QueryOptions<any>) => 
          client.patch(`${basePath}(${formatId(id)})`, data, extractRequestOptions(options)),
        delete: (id: string | number, options?: QueryOptions<any>) => 
          client.delete(`${basePath}(${formatId(id)})`, extractRequestOptions(options)),
      };

      return handler;
    }
  });
}
