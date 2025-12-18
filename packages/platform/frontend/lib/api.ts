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
export interface Connection {
  id: string;
  name: string;
  baseUrl: string;
  authType: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom';
  environment: 'dev' | 'staging' | 'prod';
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  alias: string;
  servicePath: string;
  description?: string;
  entities: string[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionService {
  id: string;
  connectionId: string;
  serviceId: string;
  servicePathOverride?: string;
  createdAt: string;
  connection?: { id: string; name: string; environment: string };
  service?: { id: string; name: string; alias: string; entities?: string[] };
}

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  displayKey: string;
  environment: 'dev' | 'staging' | 'prod';
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  expiresAt?: string;
  revoked: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface RequestLog {
  id: string;
  apiKeyId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime?: number;
  createdAt: string;
}

export interface AccessGrant {
  connectionServiceId: string;
  permissions: Record<string, string[]>;
}

export const api = {
  connections: {
    list: () => fetchAPI<Connection[]>('/admin/connections'),
    get: (id: string) => fetchAPI<Connection>(`/admin/connections/${id}`),
    create: (data: {
      name: string;
      baseUrl: string;
      authType: string;
      environment: string;
      organizationId: string;
      username?: string;
      password?: string;
    }) => fetchAPI<Connection>('/admin/connections', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{
      name: string;
      baseUrl: string;
      authType: string;
      environment: string;
      username?: string;
      password?: string;
    }>) => fetchAPI<Connection>(`/admin/connections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<{ success: boolean }>(`/admin/connections/${id}`, { method: 'DELETE' }),
  },

  services: {
    list: (organizationId?: string) => {
      const params = organizationId ? `?organizationId=${organizationId}` : '';
      return fetchAPI<Service[]>(`/admin/services${params}`);
    },
    get: (id: string) => fetchAPI<Service>(`/admin/services/${id}`),
    create: (data: {
      name: string;
      alias: string;
      servicePath: string;
      description?: string;
      organizationId: string;
      entities?: string[];
    }) => fetchAPI<Service>('/admin/services', { method: 'POST', body: JSON.stringify({ ...data, entities: data.entities || [] }) }),
    update: (id: string, data: Partial<{ name: string; alias: string; servicePath: string; description: string }>) =>
      fetchAPI<Service>(`/admin/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<{ success: boolean }>(`/admin/services/${id}`, { method: 'DELETE' }),
    syncEntities: (id: string, connectionId: string, merge = true) =>
      fetchAPI<Service & { discovered: number; added: number }>(`/admin/services/${id}/sync-entities`, {
        method: 'POST',
        body: JSON.stringify({ connectionId, merge }),
      }),
  },

  connectionServices: {
    list: () => fetchAPI<ConnectionService[]>('/admin/connection-services'),
    get: (id: string) => fetchAPI<ConnectionService>(`/admin/connection-services/${id}`),
    listByConnection: (connectionId: string) =>
      fetchAPI<ConnectionService[]>(`/admin/connection-services?connectionId=${connectionId}`),
    create: (data: { connectionId: string; serviceId: string; servicePathOverride?: string }) =>
      fetchAPI<ConnectionService>('/admin/connection-services', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<{ success: boolean }>(`/admin/connection-services/${id}`, { method: 'DELETE' }),
  },

  apiKeys: {
    list: () => fetchAPI<ApiKey[]>('/admin/api-keys'),
    get: (id: string) => fetchAPI<ApiKey>(`/admin/api-keys/${id}`),
    create: (data: {
      name: string;
      description?: string;
      organizationId: string;
      environment: string;
      rateLimitPerMinute: number;
      rateLimitPerDay: number;
      expiresAt?: string;
      accessGrants: AccessGrant[];
    }) => fetchAPI<ApiKey & { secretKey: string }>('/admin/api-keys', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{
      name: string;
      description?: string;
      environment: string;
      rateLimitPerMinute: number;
      rateLimitPerDay: number;
      expiresAt?: string | null;
    }>) => fetchAPI<ApiKey>(`/admin/api-keys/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    revoke: (id: string, reason?: string) =>
      fetchAPI<{ success: boolean }>(`/admin/api-keys/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
    delete: (id: string) => fetchAPI<{ success: boolean }>(`/admin/api-keys/${id}`, { method: 'DELETE' }),
    getAccess: (id: string) => fetchAPI<Array<AccessGrant & { id: string; connection?: { id: string; name: string; environment: string } | null; service?: { id: string; name: string; alias: string; entities?: string[] } | null }>>(`/admin/api-keys/${id}/access`),
    addAccessGrant: (id: string, data: AccessGrant) =>
      fetchAPI<AccessGrant & { id: string }>(`/admin/api-keys/${id}/access`, { method: 'POST', body: JSON.stringify(data) }),
    updateAccessGrant: (id: string, grantId: string, permissions: Record<string, string[]>) =>
      fetchAPI<AccessGrant & { id: string }>(`/admin/api-keys/${id}/access/${grantId}`, { method: 'PATCH', body: JSON.stringify({ permissions }) }),
    deleteAccessGrant: (id: string, grantId: string) =>
      fetchAPI<{ success: boolean }>(`/admin/api-keys/${id}/access/${grantId}`, { method: 'DELETE' }),
  },

  logs: {
    list: (params?: { limit?: number; offset?: number; apiKeyId?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      if (params?.apiKeyId) searchParams.set('apiKeyId', params.apiKeyId);
      return fetchAPI<RequestLog[]>(`/admin/logs?${searchParams}`);
    },
  },
};

