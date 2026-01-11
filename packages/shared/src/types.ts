import type { InferSelectModel } from 'drizzle-orm';
import {
  apiKeys,
  systems,
  instances,
  systemServices,
  instanceServices,
  apiKeyAccess,
  predefinedServices,
  organizations,
} from './db/schema.ts';

// Database model types
export type Organization = InferSelectModel<typeof organizations>;
export type ApiKey = InferSelectModel<typeof apiKeys>;
export type System = InferSelectModel<typeof systems>;
export type Instance = InferSelectModel<typeof instances>;
export type SystemService = InferSelectModel<typeof systemServices>;
export type InstanceService = InferSelectModel<typeof instanceServices>;
export type ApiKeyAccessGrant = InferSelectModel<typeof apiKeyAccess>;
export type PredefinedService = InferSelectModel<typeof predefinedServices>;

// Entity-level permissions: { "A_BusinessPartner": ["read"], "A_SalesOrder": ["create", "read", "update", "delete"] }
export type EntityPermissions = Record<string, string[]>;

// Error categories for structured error logging
export type ErrorCategory = 'auth' | 'permission' | 'validation' | 'server' | 'network' | 'timeout';

// Secure log data - metadata only, no body content
export type SecureLogData = {
  // Entity context
  entity?: string;
  operation?: 'read' | 'create' | 'update' | 'delete';

  // Performance
  sapResponseTime?: number;

  // Size metrics (instead of body content)
  requestSize?: number;
  responseSize?: number;
  recordCount?: number;

  // Error handling (structured)
  errorCode?: string;
  errorCategory?: ErrorCategory;
  errorMessage?: string;

  // Audit
  requestId: string;
  clientIpHash?: string;
  userAgent?: string;
};

// Hono context variables for proxy routes
export type ProxyVariables = {
  apiKey: ApiKey;
  instance: Instance;
  systemService: SystemService;
  instanceService: InstanceService;
  entityPermissions: EntityPermissions;
  // Secure request logging data - no body storage
  logData?: SecureLogData;
};

// Auth configuration resolved from instance/service/instanceService
export type ResolvedAuth = {
  type: 'none' | 'basic' | 'oauth2' | 'custom';
  username?: string | null;
  password?: string | null;
  config?: unknown;
  credentials?: unknown;
};
