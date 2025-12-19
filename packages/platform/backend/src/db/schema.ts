import { pgTable, uuid, varchar, timestamp, boolean, jsonb, integer, pgEnum, unique } from 'drizzle-orm/pg-core';

// Enums
export const systemTypeEnum = pgEnum('system_type', ['s4_public', 's4_private', 'btp', 'other']);
export const instanceEnvironmentEnum = pgEnum('instance_environment', ['dev', 'quality', 'production']);
export const authTypeEnum = pgEnum('auth_type', ['none', 'basic', 'oauth2', 'api_key', 'custom']);

// Organizations table
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Systems table (replaces connections)
export const systems = pgTable('systems', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: systemTypeEnum('type').notNull(),
  description: varchar('description', { length: 1000 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Instances table - each system can have multiple instances (DEV, QUALITY, PRODUCTION)
export const instances = pgTable('instances', {
  id: uuid('id').defaultRandom().primaryKey(),
  systemId: uuid('system_id').references(() => systems.id, { onDelete: 'cascade' }).notNull(),
  environment: instanceEnvironmentEnum('environment').notNull(),
  baseUrl: varchar('base_url', { length: 500 }).notNull(),
  
  // Auth configuration for this instance
  authType: authTypeEnum('auth_type').default('basic').notNull(),
  
  // Basic auth fields
  username: varchar('username', { length: 255 }), // encrypted
  password: varchar('password', { length: 500 }), // encrypted
  
  // Flexible storage for complex auth settings (tokenUrl, scope, headerName, clientId)
  authConfig: jsonb('auth_config'),
  
  // Sensitive credentials (clientSecret, privateKey, certificates, tokens) - encrypted
  credentials: jsonb('credentials'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSystemEnvironment: unique().on(table.systemId, table.environment),
}));

// Predefined services - seed table for S/4HANA APIs
export const predefinedServices = pgTable('predefined_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  systemType: systemTypeEnum('system_type').notNull(), // which system types this service applies to
  name: varchar('name', { length: 255 }).notNull(),
  alias: varchar('alias', { length: 50 }).notNull(),
  servicePath: varchar('service_path', { length: 500 }).notNull(),
  description: varchar('description', { length: 1000 }),
  defaultEntities: jsonb('default_entities').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSystemTypeAlias: unique().on(table.systemType, table.alias),
}));

// System services - services available on a system (either from predefined or custom)
export const systemServices = pgTable('system_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  systemId: uuid('system_id').references(() => systems.id, { onDelete: 'cascade' }).notNull(),
  predefinedServiceId: uuid('predefined_service_id').references(() => predefinedServices.id, { onDelete: 'set null' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  alias: varchar('alias', { length: 50 }).notNull(),
  servicePath: varchar('service_path', { length: 500 }).notNull(),
  description: varchar('description', { length: 1000 }),
  
  // Entity names this service exposes
  entities: jsonb('entities').$type<string[]>().default([]),
  
  // Optional service-level auth (used as default when linked to instances)
  authType: authTypeEnum('auth_type'), // null = inherit from instance
  username: varchar('username', { length: 255 }), // encrypted
  password: varchar('password', { length: 500 }), // encrypted
  authConfig: jsonb('auth_config'),
  credentials: jsonb('credentials'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSystemAlias: unique().on(table.systemId, table.alias),
}));

// Instance services - links services to specific instances with optional auth override
export const instanceServices = pgTable('instance_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  instanceId: uuid('instance_id').references(() => instances.id, { onDelete: 'cascade' }).notNull(),
  systemServiceId: uuid('system_service_id').references(() => systemServices.id, { onDelete: 'cascade' }).notNull(),
  
  // Optional: override service path for this specific instance
  servicePathOverride: varchar('service_path_override', { length: 500 }),
  
  // Optional: per-instance entity list (null = inherit from systemService)
  entities: jsonb('entities').$type<string[] | null>(),
  
  // Optional: per-instance-service authentication override
  authType: authTypeEnum('auth_type'), // null = inherit from systemService or instance
  username: varchar('username', { length: 255 }), // encrypted
  password: varchar('password', { length: 500 }), // encrypted
  authConfig: jsonb('auth_config'),
  credentials: jsonb('credentials'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueInstanceService: unique().on(table.instanceId, table.systemServiceId),
}));

// API Keys table - Stripe-like secure key management
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  
  // Security fields
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
  keyPrefix: varchar('key_prefix', { length: 24 }).notNull(),
  keyLast4: varchar('key_last_4', { length: 4 }).notNull(),
  
  // Metadata
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  
  // Rate limiting
  rateLimitPerMinute: integer('rate_limit_per_minute').default(60).notNull(),
  rateLimitPerDay: integer('rate_limit_per_day').default(10000).notNull(),
  
  // Lifecycle
  expiresAt: timestamp('expires_at'),
  revoked: boolean('revoked').default(false).notNull(),
  revokedAt: timestamp('revoked_at'),
  revokedReason: varchar('revoked_reason', { length: 500 }),
  
  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 255 }),
  lastUsedAt: timestamp('last_used_at'),
  lastUsedIp: varchar('last_used_ip', { length: 45 }),
  usageCount: integer('usage_count').default(0).notNull(),
});

// API key access grants - links API key to instance+service with entity-level permissions
export const apiKeyAccess = pgTable('api_key_access', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'cascade' }).notNull(),
  instanceServiceId: uuid('instance_service_id').references(() => instanceServices.id, { onDelete: 'cascade' }).notNull(),
  
  // Entity-level permissions: { "A_BusinessPartner": ["read"], "A_SalesOrder": ["create", "read", "update", "delete"] }
  permissions: jsonb('permissions').notNull().$type<Record<string, string[]>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueKeyInstanceService: unique().on(table.apiKeyId, table.instanceServiceId),
}));

// Request logs table
export const requestLogs = pgTable('request_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'cascade' }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  statusCode: integer('status_code').notNull(),
  responseTime: integer('response_time'),
  sapResponseTime: integer('sap_response_time'),
  requestBody: jsonb('request_body'),
  responseBody: jsonb('response_body'),
  requestHeaders: jsonb('request_headers'),
  responseHeaders: jsonb('response_headers'),
  errorMessage: varchar('error_message', { length: 2000 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
