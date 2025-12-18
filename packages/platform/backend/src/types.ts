import { apiKeys, connections, services, connectionServices, apiKeyAccess } from './db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type Connection = InferSelectModel<typeof connections>;
export type Service = InferSelectModel<typeof services>;
export type ConnectionService = InferSelectModel<typeof connectionServices>;
export type ApiKeyAccessGrant = InferSelectModel<typeof apiKeyAccess>;

// Entity-level permissions: { "A_BusinessPartner": ["read"], "A_SalesOrder": ["create", "read", "update", "delete"] }
export type EntityPermissions = Record<string, string[]>;

export type Variables = {
  apiKey: ApiKey;
  connection: Connection;
  service: Service;
  connectionService: ConnectionService;
  entityPermissions: EntityPermissions;
};

