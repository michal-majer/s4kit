const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error');
    throw new Error(error || `API Error: ${res.status}`);
  }

  return res.json();
}

// Types
export type SystemType = 's4_public' | 's4_private' | 'btp' | 'other';
export type InstanceEnvironment = 'sandbox' | 'dev' | 'quality' | 'preprod' | 'production';

export interface System {
  id: string;
  name: string;
  type: SystemType;
  description?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Instance {
  id: string;
  systemId: string;
  environment: InstanceEnvironment;
  baseUrl: string;
  authType: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom';
  authConfig?: {
    headerName?: string;
    tokenUrl?: string;
    scope?: string;
    authorizationUrl?: string;
    clientId?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SystemService {
  id: string;
  systemId: string;
  predefinedServiceId?: string;
  name: string;
  alias: string;
  servicePath: string;
  description?: string;
  entities: string[];
  authType?: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom' | null;
  authConfig?: {
    headerName?: string;
    tokenUrl?: string;
    scope?: string;
    authorizationUrl?: string;
    clientId?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InstanceService {
  id: string;
  instanceId: string;
  systemServiceId: string;
  servicePathOverride?: string;
  entities?: string[]; // Resolved entities (instanceService.entities or inherited from systemService)
  hasEntityOverride?: boolean; // True if instanceService.entities is set (not null)
  authType?: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom' | null;
  hasAuthOverride?: boolean;
  // Verification status fields
  verificationStatus?: 'pending' | 'verified' | 'failed' | null;
  lastVerifiedAt?: string | null;
  verificationError?: string | null;
  entityCount?: number | null;
  createdAt: string;
  instance?: { id: string; environment: InstanceEnvironment };
  systemService?: { id: string; name: string; alias: string; entities?: string[] };
  authConfig?: {
    headerName?: string;
    tokenUrl?: string;
    scope?: string;
    authorizationUrl?: string;
    clientId?: string;
    [key: string]: any;
  };
}

export interface PredefinedService {
  id: string;
  systemType: SystemType;
  name: string;
  alias: string;
  servicePath: string;
  description?: string;
  defaultEntities: string[];
  createdAt: string;
}

export type LogLevel = 'minimal' | 'standard' | 'extended';

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  displayKey: string;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  logLevel?: LogLevel;  // null = inherit from organization
  expiresAt?: string;
  revoked: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

// Secure request log - metadata only, no body content
export type ErrorCategory = 'auth' | 'permission' | 'validation' | 'server' | 'network' | 'timeout';
export type Operation = 'read' | 'create' | 'update' | 'delete';

export interface RequestLog {
  id: string;
  apiKeyId: string;

  // Request metadata
  method: string;
  path: string;
  entity?: string;
  operation?: Operation;

  // Response metadata
  statusCode: number;
  success: boolean;

  // Performance metrics
  responseTime?: number;
  sapResponseTime?: number;

  // Size metrics (no body content)
  requestSize?: number;
  responseSize?: number;
  recordCount?: number;

  // Error handling (structured)
  errorCode?: string;
  errorCategory?: ErrorCategory;
  errorMessage?: string;

  // Audit trail
  requestId?: string;
  clientIpHash?: string;
  userAgent?: string;

  createdAt: string;
}

export interface LogsResponse {
  data: RequestLog[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface LogAnalytics {
  summary: {
    totalRequests: number;
    successCount: number;
    errorCount: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    totalRequestBytes: number;
    totalResponseBytes: number;
  };
  topEntities: Array<{
    entity: string;
    count: number;
    successRate: number;
    avgResponseTime: number;
  }>;
  errorDistribution: Array<{
    category: ErrorCategory;
    count: number;
  }>;
  hourlyStats: Array<{
    hour: string;
    count: number;
    successCount: number;
    avgResponseTime: number;
  }>;
}

export interface AccessGrant {
  instanceServiceId: string;
  permissions: Record<string, string[]>;
}

export const api = {
  systems: {
    list: () => fetchAPI<System[]>('/admin/systems'),
    get: (id: string) => fetchAPI<System>(`/admin/systems/${id}`),
    create: (data: {
      name: string;
      type: SystemType;
      description?: string;
      organizationId: string;
    }) => fetchAPI<System>('/admin/systems', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{
      name: string;
      description?: string;
    }>) => fetchAPI<System>(`/admin/systems/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<{ success: boolean }>(`/admin/systems/${id}`, { method: 'DELETE' }),
  },

  instances: {
    list: (systemId?: string) => {
      const params = systemId ? `?systemId=${systemId}` : '';
      return fetchAPI<Instance[]>(`/admin/instances${params}`);
    },
    get: (id: string) => fetchAPI<Instance>(`/admin/instances/${id}`),
    create: (data: {
      systemId: string;
      environment: InstanceEnvironment;
      baseUrl: string;
      authType: string;
      // Basic auth
      username?: string;
      password?: string;
      // API Key auth
      apiKey?: string;
      apiKeyHeaderName?: string;
      // OAuth2 auth
      oauth2ClientId?: string;
      oauth2ClientSecret?: string;
      oauth2TokenUrl?: string;
      oauth2Scope?: string;
      oauth2AuthorizationUrl?: string;
      // Custom auth
      customHeaderName?: string;
      customHeaderValue?: string;
    }) => fetchAPI<Instance>('/admin/instances', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{
      baseUrl: string;
      authType: string;
      username?: string;
      password?: string;
      apiKey?: string;
      apiKeyHeaderName?: string;
      oauth2ClientId?: string;
      oauth2ClientSecret?: string;
      oauth2TokenUrl?: string;
      oauth2Scope?: string;
      oauth2AuthorizationUrl?: string;
      customHeaderName?: string;
      customHeaderValue?: string;
    }>) => fetchAPI<Instance>(`/admin/instances/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<{ success: boolean }>(`/admin/instances/${id}`, { method: 'DELETE' }),
    refreshAllServices: (id: string) => fetchAPI<{
      success: boolean;
      verified: number;
      failed: number;
      total: number;
      results: Array<{ serviceId: string; status: 'verified' | 'failed'; entityCount?: number; error?: string }>;
    }>(`/admin/instances/${id}/refresh-all-services`, { method: 'POST' }),
  },

  systemServices: {
    list: (systemId?: string) => {
      const params = systemId ? `?systemId=${systemId}` : '';
      return fetchAPI<SystemService[]>(`/admin/system-services${params}`);
    },
    get: (id: string) => fetchAPI<SystemService>(`/admin/system-services/${id}`),
    create: (data: {
      systemId: string;
      name: string;
      alias: string;
      servicePath: string;
      description?: string;
      entities?: string[];
      predefinedServiceId?: string;
      authType?: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom';
      username?: string;
      password?: string;
      apiKey?: string;
      apiKeyHeaderName?: string;
      oauth2ClientId?: string;
      oauth2ClientSecret?: string;
      oauth2TokenUrl?: string;
      oauth2Scope?: string;
      oauth2AuthorizationUrl?: string;
    }) => fetchAPI<SystemService>('/admin/system-services', { method: 'POST', body: JSON.stringify({ ...data, entities: data.entities || [] }) }),
    update: (id: string, data: Partial<{
      name: string;
      alias: string;
      servicePath: string;
      description?: string;
      entities?: string[];
      authType?: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom' | null;
      username?: string | null;
      password?: string | null;
      apiKey?: string;
      apiKeyHeaderName?: string;
      oauth2ClientId?: string;
      oauth2ClientSecret?: string;
      oauth2TokenUrl?: string;
      oauth2Scope?: string;
      oauth2AuthorizationUrl?: string;
    }>) =>
      fetchAPI<SystemService>(`/admin/system-services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<{ success: boolean }>(`/admin/system-services/${id}`, { method: 'DELETE' }),
    getPredefined: (systemType: SystemType) => fetchAPI<PredefinedService[]>(`/admin/system-services/predefined/${systemType}`),
    refreshEntities: (id: string) => fetchAPI<SystemService & { refreshedCount?: number }>(`/admin/system-services/${id}/refresh-entities`, { method: 'POST' }),
  },

  instanceServices: {
    list: (params?: { instanceId?: string; systemServiceId?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.instanceId) searchParams.set('instanceId', params.instanceId);
      if (params?.systemServiceId) searchParams.set('systemServiceId', params.systemServiceId);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return fetchAPI<InstanceService[]>(`/admin/instance-services${query}`);
    },
    get: (id: string) => fetchAPI<InstanceService>(`/admin/instance-services/${id}`),
    create: (data: {
      instanceId: string;
      systemServiceId: string;
      servicePathOverride?: string;
      entities?: string[] | null; // null = inherit from systemService
      authType?: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom';
      username?: string;
      password?: string;
      apiKey?: string;
      apiKeyHeaderName?: string;
      oauth2ClientId?: string;
      oauth2ClientSecret?: string;
      oauth2TokenUrl?: string;
      oauth2Scope?: string;
      oauth2AuthorizationUrl?: string;
    }) =>
      fetchAPI<InstanceService>('/admin/instance-services', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{
      servicePathOverride?: string | null;
      entities?: string[] | null; // null = inherit from systemService
      authType?: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom' | null;
      username?: string | null;
      password?: string | null;
      apiKey?: string;
      apiKeyHeaderName?: string;
      oauth2ClientId?: string;
      oauth2ClientSecret?: string;
      oauth2TokenUrl?: string;
      oauth2Scope?: string;
      oauth2AuthorizationUrl?: string;
    }>) =>
      fetchAPI<InstanceService>(`/admin/instance-services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<{ success: boolean }>(`/admin/instance-services/${id}`, { method: 'DELETE' }),
    refreshEntities: (id: string) => fetchAPI<InstanceService & { refreshedCount?: number }>(`/admin/instance-services/${id}/refresh-entities`, { method: 'POST' }),
  },

  apiKeys: {
    list: () => fetchAPI<ApiKey[]>('/admin/api-keys'),
    get: (id: string) => fetchAPI<ApiKey>(`/admin/api-keys/${id}`),
    create: (data: {
      name: string;
      description?: string;
      organizationId: string;
      rateLimitPerMinute: number;
      rateLimitPerDay: number;
      expiresAt?: string;
      accessGrants: AccessGrant[];
    }) => fetchAPI<ApiKey & { secretKey: string }>('/admin/api-keys', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{
      name: string;
      description?: string;
      rateLimitPerMinute: number;
      rateLimitPerDay: number;
      expiresAt?: string | null;
    }>) => fetchAPI<ApiKey>(`/admin/api-keys/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    revoke: (id: string, reason?: string) =>
      fetchAPI<{ success: boolean }>(`/admin/api-keys/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
    delete: (id: string) => fetchAPI<{ success: boolean }>(`/admin/api-keys/${id}`, { method: 'DELETE' }),
    getAccess: (id: string) => fetchAPI<Array<AccessGrant & { id: string; instance?: { id: string; environment: InstanceEnvironment } | null; systemService?: { id: string; name: string; alias: string; entities?: string[] } | null }>>(`/admin/api-keys/${id}/access`),
    addAccessGrant: (id: string, data: AccessGrant) =>
      fetchAPI<AccessGrant & { id: string }>(`/admin/api-keys/${id}/access`, { method: 'POST', body: JSON.stringify(data) }),
    updateAccessGrant: (id: string, grantId: string, permissions: Record<string, string[]>) =>
      fetchAPI<AccessGrant & { id: string }>(`/admin/api-keys/${id}/access/${grantId}`, { method: 'PATCH', body: JSON.stringify({ permissions }) }),
    deleteAccessGrant: (id: string, grantId: string) =>
      fetchAPI<{ success: boolean }>(`/admin/api-keys/${id}/access/${grantId}`, { method: 'DELETE' }),
    rotate: (id: string, options?: { revokeReason?: string; newName?: string }) =>
      fetchAPI<{
        newKey: {
          id: string;
          name: string;
          description?: string;
          secretKey: string;
          displayKey: string;
          rateLimitPerMinute: number;
          rateLimitPerDay: number;
          expiresAt?: string;
          createdAt: string;
          accessGrantsCount: number;
        };
        revokedKey: {
          id: string;
          displayKey: string;
        };
        warning: string;
      }>(`/admin/api-keys/${id}/rotate`, { method: 'POST', body: JSON.stringify(options || {}) }),
  },

  logs: {
    list: (params?: {
      limit?: number;
      offset?: number;
      apiKeyId?: string;
      entity?: string;
      operation?: Operation;
      success?: boolean;
      errorCategory?: ErrorCategory;
      from?: string;
      to?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      if (params?.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId);
      if (params?.entity) searchParams.set('entity', params.entity);
      if (params?.operation) searchParams.set('operation', params.operation);
      if (params?.success !== undefined) searchParams.set('success', params.success.toString());
      if (params?.errorCategory) searchParams.set('errorCategory', params.errorCategory);
      if (params?.from) searchParams.set('from', params.from);
      if (params?.to) searchParams.set('to', params.to);
      return fetchAPI<LogsResponse>(`/admin/logs?${searchParams}`);
    },
    get: (id: string) => fetchAPI<RequestLog>(`/admin/logs/${id}`),
    analytics: (params: {
      from: string;
      to: string;
      apiKeyId?: string;
    }) => {
      const searchParams = new URLSearchParams();
      searchParams.set('from', params.from);
      searchParams.set('to', params.to);
      if (params.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId);
      return fetchAPI<LogAnalytics>(`/admin/logs/analytics?${searchParams}`);
    },
  },
};
