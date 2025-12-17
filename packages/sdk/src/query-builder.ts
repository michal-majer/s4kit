import type{ QueryOptions } from './types';

export function buildQuery(options?: QueryOptions): Record<string, string> {
  if (!options) return {};

  const params: Record<string, string> = {};

  if (options.select?.length) params['$select'] = options.select.join(',');
  if (options.filter) params['$filter'] = options.filter;
  if (options.top) params['$top'] = String(options.top);
  if (options.skip) params['$skip'] = String(options.skip);
  if (options.orderBy) params['$orderby'] = options.orderBy;
  if (options.expand?.length) params['$expand'] = options.expand.join(',');

  return params;
}
