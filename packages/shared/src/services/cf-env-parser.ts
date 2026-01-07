/**
 * Cloud Foundry Environment Parser
 *
 * Parses VCAP_SERVICES to extract database, cache, and secret configuration
 * from Cloud Foundry service bindings. Falls back to direct environment
 * variables for local development or non-CF environments.
 */

interface PostgresCredentials {
  uri?: string;
  hostname?: string;
  host?: string;
  port?: string | number;
  username?: string;
  user?: string;
  password?: string;
  database?: string;
  dbname?: string;
  sslmode?: string;
}

interface RedisCredentials {
  uri?: string;
  hostname?: string;
  host?: string;
  port?: string | number;
  password?: string;
}

interface VcapServices {
  'postgresql-db'?: Array<{ name?: string; credentials: PostgresCredentials }>;
  postgresql?: Array<{ name?: string; credentials: PostgresCredentials }>;
  'redis-cache'?: Array<{ name?: string; credentials: RedisCredentials }>;
  redis?: Array<{ name?: string; credentials: RedisCredentials }>;
  'user-provided'?: Array<{
    name: string;
    credentials: Record<string, string>;
  }>;
  [key: string]: unknown;
}

/**
 * Parse VCAP_SERVICES from environment
 */
function parseVcapServices(): VcapServices | null {
  const vcapRaw = process.env.VCAP_SERVICES;
  if (!vcapRaw) return null;

  try {
    return JSON.parse(vcapRaw) as VcapServices;
  } catch {
    console.error('Failed to parse VCAP_SERVICES JSON');
    return null;
  }
}

/**
 * Build PostgreSQL connection string from credentials
 */
function buildPostgresUrl(creds: PostgresCredentials): string {
  const host = creds.hostname || creds.host || 'localhost';
  const port = creds.port || 5432;
  const user = creds.username || creds.user || 'postgres';
  const pass = creds.password || '';
  const db = creds.database || creds.dbname || 'postgres';
  const ssl = creds.sslmode ? `?sslmode=${creds.sslmode}` : '';

  return `postgres://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}${ssl}`;
}

/**
 * Build Redis connection string from credentials
 */
function buildRedisUrl(creds: RedisCredentials): string {
  const host = creds.hostname || creds.host || 'localhost';
  const port = creds.port || 6379;
  const pass = creds.password;

  if (pass) {
    return `redis://:${encodeURIComponent(pass)}@${host}:${port}`;
  }
  return `redis://${host}:${port}`;
}

/**
 * Get PostgreSQL connection URL from VCAP_SERVICES or environment
 *
 * Checks in order:
 * 1. DATABASE_URL environment variable (direct config)
 * 2. VCAP_SERVICES postgresql-db service (BTP Hyperscaler)
 * 3. VCAP_SERVICES postgresql service (generic)
 * 4. VCAP_SERVICES user-provided service containing 'postgres' in name
 *
 * @throws Error if no PostgreSQL configuration found
 */
export function getDatabaseUrl(): string {
  // Direct env var takes precedence (for local dev or explicit config)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const vcap = parseVcapServices();
  if (!vcap) {
    throw new Error('DATABASE_URL not set and VCAP_SERVICES not available');
  }

  // Try BTP PostgreSQL Hyperscaler
  const pgService = vcap['postgresql-db']?.[0] || vcap.postgresql?.[0];
  if (pgService?.credentials) {
    const creds = pgService.credentials;
    if (creds.uri) return creds.uri;
    return buildPostgresUrl(creds);
  }

  // Try user-provided service
  const ups = vcap['user-provided']?.find(
    (s) => s.name.includes('postgres') || s.name.includes('database')
  );
  if (ups?.credentials) {
    if (ups.credentials.uri) return ups.credentials.uri;
    return buildPostgresUrl(ups.credentials as PostgresCredentials);
  }

  throw new Error('No PostgreSQL service binding found in VCAP_SERVICES');
}

/**
 * Get Redis connection URL from VCAP_SERVICES or environment
 *
 * Checks in order:
 * 1. REDIS_URL environment variable (direct config)
 * 2. VCAP_SERVICES redis-cache service (BTP Hyperscaler)
 * 3. VCAP_SERVICES redis service (generic)
 * 4. VCAP_SERVICES user-provided service containing 'redis' in name
 *
 * @throws Error if no Redis configuration found
 */
export function getRedisUrl(): string {
  // Direct env var takes precedence
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const vcap = parseVcapServices();
  if (!vcap) {
    throw new Error('REDIS_URL not set and VCAP_SERVICES not available');
  }

  // Try BTP Redis Hyperscaler
  const redisService = vcap['redis-cache']?.[0] || vcap.redis?.[0];
  if (redisService?.credentials) {
    const creds = redisService.credentials;
    if (creds.uri) return creds.uri;
    return buildRedisUrl(creds);
  }

  // Try user-provided service
  const ups = vcap['user-provided']?.find(
    (s) => s.name.includes('redis') || s.name.includes('cache')
  );
  if (ups?.credentials) {
    if (ups.credentials.uri) return ups.credentials.uri;
    return buildRedisUrl(ups.credentials as RedisCredentials);
  }

  throw new Error('No Redis service binding found in VCAP_SERVICES');
}

/**
 * Get a secret value from user-provided service or environment
 *
 * Checks in order:
 * 1. Direct environment variable
 * 2. VCAP_SERVICES user-provided service containing 'secrets' or 'config' in name
 *
 * @param key - The secret key to retrieve
 * @returns The secret value or undefined if not found
 */
export function getSecret(key: string): string | undefined {
  // Direct env var takes precedence
  if (process.env[key]) {
    return process.env[key];
  }

  const vcap = parseVcapServices();
  if (!vcap) return undefined;

  // Check user-provided services for secrets
  const secretsService = vcap['user-provided']?.find(
    (s) => s.name.includes('secrets') || s.name.includes('config')
  );
  if (secretsService?.credentials) {
    return secretsService.credentials[key];
  }

  return undefined;
}

/**
 * Get a required secret value, throws if not found
 *
 * @param key - The secret key to retrieve
 * @throws Error if the secret is not found
 */
export function getRequiredSecret(key: string): string {
  const value = getSecret(key);
  if (!value) {
    throw new Error(
      `Required secret ${key} not found in environment or VCAP_SERVICES user-provided service`
    );
  }
  return value;
}

/**
 * Check if running in Cloud Foundry environment
 */
export function isCloudFoundry(): boolean {
  return !!process.env.VCAP_SERVICES || !!process.env.VCAP_APPLICATION;
}

/**
 * CF Environment Parser singleton
 */
export const cfEnvParser = {
  getDatabaseUrl,
  getRedisUrl,
  getSecret,
  getRequiredSecret,
  isCloudFoundry,
};
