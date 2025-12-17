import { pgTable, uuid, varchar, timestamp, boolean, jsonb, integer, pgEnum, unique } from 'drizzle-orm/pg-core';

// Enums
export const environmentEnum = pgEnum('environment', ['dev', 'staging', 'prod']);
export const authTypeEnum = pgEnum('auth_type', ['none', 'basic', 'oauth2', 'api_key', 'custom']);

// Organizations table
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Connections table
export const connections = pgTable('connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  baseUrl: varchar('base_url', { length: 500 }).notNull(),
  
  // Auth configuration
  authType: authTypeEnum('auth_type').default('basic').notNull(),
  
  // Legacy/Basic fields - made nullable to support other auth types
  username: varchar('username', { length: 255 }), // Will be encrypted in application layer
  password: varchar('password', { length: 500 }), // Will be encrypted in application layer
  
  // Flexible storage for complex auth settings
  // Stores non-sensitive config (e.g. tokenUrl, scope, headerName, clientId)
  authConfig: jsonb('auth_config'), 
  
  // Stores sensitive data (e.g. clientSecret, privateKey, certificates, tokens)
  // This column should be encrypted at the application layer
  credentials: jsonb('credentials'),

  environment: environmentEnum('environment').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// OData services defined at organization level
export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),           // "Business Partner API"
  alias: varchar('alias', { length: 50 }).notNull(),          // "bp" - used in SDK
  servicePath: varchar('service_path', { length: 500 }).notNull(), // "/sap/opu/odata/sap/API_BUSINESS_PARTNER"
  description: varchar('description', { length: 1000 }),
  
  // Entity names this service exposes - for auto-resolving entity → service
  // e.g., ["A_BusinessPartner", "A_BusinessPartnerAddress", "A_BusinessPartnerBank"]
  entities: jsonb('entities').$type<string[]>().default([]),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Which services are available on which connections (with optional auth override)
export const connectionServices = pgTable('connection_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectionId: uuid('connection_id').references(() => connections.id, { onDelete: 'cascade' }).notNull(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  
  // Optional: override service path for this specific connection
  servicePathOverride: varchar('service_path_override', { length: 500 }),
  
  // Optional: per-service authentication override
  // If null, inherits from the connection's auth settings
  authType: authTypeEnum('auth_type'),  // null = inherit from connection
  
  // Basic auth override
  username: varchar('username', { length: 255 }),  // encrypted
  password: varchar('password', { length: 500 }),  // encrypted
  
  // Flexible auth config (OAuth2 tokenUrl, scope, etc.)
  authConfig: jsonb('auth_config'),
  
  // Sensitive credentials (clientSecret, tokens, etc.) - encrypted
  credentials: jsonb('credentials'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueConnectionService: unique().on(table.connectionId, table.serviceId),
}));

// API Keys table - Stripe-like secure key management
// Key format: s4k_{env}_{keyId}_{random} (e.g., s4k_live_abc12345_xY7kM9pL...)
// - Only shown once at creation, then only keyPrefix + last4 displayed
// - keyId is embedded in the key for O(1) lookup without hash scanning
// - SHA-256 hash stored for verification
// Note: connectionId and permissions moved to apiKeyAccess table for multi-connection support
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  
  // Security fields
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(), // SHA-256 hash of full key
  keyPrefix: varchar('key_prefix', { length: 24 }).notNull(), // Visible prefix: "s4k_live_abc12345" for display
  keyLast4: varchar('key_last_4', { length: 4 }).notNull(), // Last 4 chars for identification: "...xY7k"
  
  // Metadata
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }), // Optional description for the key
  environment: environmentEnum('environment').notNull(),
  
  // Rate limiting
  rateLimitPerMinute: integer('rate_limit_per_minute').default(60).notNull(),
  rateLimitPerDay: integer('rate_limit_per_day').default(10000).notNull(),
  
  // Lifecycle
  expiresAt: timestamp('expires_at'),
  revoked: boolean('revoked').default(false).notNull(),
  revokedAt: timestamp('revoked_at'), // When the key was revoked
  revokedReason: varchar('revoked_reason', { length: 500 }), // Why the key was revoked
  
  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 255 }), // Who created this key
  lastUsedAt: timestamp('last_used_at'),
  lastUsedIp: varchar('last_used_ip', { length: 45 }), // IPv4 or IPv6
  usageCount: integer('usage_count').default(0).notNull(), // Total number of requests
});

// API key access grants - links API key to connection+service with entity-level permissions
export const apiKeyAccess = pgTable('api_key_access', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'cascade' }).notNull(),
  connectionServiceId: uuid('connection_service_id').references(() => connectionServices.id, { onDelete: 'cascade' }).notNull(),
  
  // Entity-level permissions: { "A_BusinessPartner": ["read"], "A_SalesOrder": ["create", "read", "update", "delete"] }
  // Use ["*"] for full access to all operations
  permissions: jsonb('permissions').notNull().$type<Record<string, string[]>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueKeyConnectionService: unique().on(table.apiKeyId, table.connectionServiceId),
}));

// Request logs table
export const requestLogs = pgTable('request_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'cascade' }).notNull(),
  method: varchar('method', { length: 10 }).notNull(), // GET, POST, PATCH, DELETE
  path: varchar('path', { length: 500 }).notNull(),
  statusCode: integer('status_code').notNull(),
  responseTime: integer('response_time'), // milliseconds
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
