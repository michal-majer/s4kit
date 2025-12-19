import { apiKeys, systems, instances, systemServices, instanceServices, apiKeyAccess, predefinedServices } from './db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type System = InferSelectModel<typeof systems>;
export type Instance = InferSelectModel<typeof instances>;
export type SystemService = InferSelectModel<typeof systemServices>;
export type InstanceService = InferSelectModel<typeof instanceServices>;
export type ApiKeyAccessGrant = InferSelectModel<typeof apiKeyAccess>;
export type PredefinedService = InferSelectModel<typeof predefinedServices>;

// Entity-level permissions: { "A_BusinessPartner": ["read"], "A_SalesOrder": ["create", "read", "update", "delete"] }
export type EntityPermissions = Record<string, string[]>;

export type Variables = {
  apiKey: ApiKey;
  instance: Instance;
  systemService: SystemService;
  instanceService: InstanceService;
  entityPermissions: EntityPermissions;
  // Request logging data
  logData?: {
    sapResponseTime?: number;
    requestBody?: any;
    responseBody?: any;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    errorMessage?: string;
  };
};
