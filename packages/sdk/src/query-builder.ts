import type{ QueryOptions } from './types';

export function buildQuery(options?: QueryOptions<any>): Record<string, string> {
  if (!options) return {};

  const params: Record<string, string> = {};

  // Convert Array<keyof T> to string[] for OData query
  if (options.select?.length) {
    params['$select'] = (options.select as string[]).join(',');
  }
  if (options.filter) params['$filter'] = options.filter;
  if (options.top) params['$top'] = String(options.top);
  if (options.skip) params['$skip'] = String(options.skip);
  if (options.orderBy) params['$orderby'] = options.orderBy;
  if (options.expand?.length) params['$expand'] = options.expand.join(',');

  return params;
}
