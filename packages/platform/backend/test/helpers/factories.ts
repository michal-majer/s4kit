/**
 * Test data factories for S4Kit backend tests
 *
 * Creates realistic test data with proper relationships.
 * All created data is tracked for automatic cleanup.
 */

import { db, organizations, systems, instances, systemServices, instanceServices, apiKeys, apiKeyAccess } from '../../src/db';
import { trackOrganization } from '../setup';
import { apiKeyService } from '../../src/services/api-key';
import { encryption } from '../../src/services/encryption';

// Counter for generating unique names
let counter = 0;
const uniqueId = () => `test_${Date.now()}_${++counter}`;

export type SystemType = 's4_public' | 's4_private' | 'btp' | 'other';
export type InstanceEnvironment = 'sandbox' | 'dev' | 'quality' | 'preprod' | 'production';
export type AuthType = 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom';

export interface CreateOrganizationOptions {
  name?: string;
  defaultLogLevel?: 'minimal' | 'standard' | 'extended';
  logRetentionDays?: number;
}

export interface CreateSystemOptions {
  name?: string;
  type?: SystemType;
  description?: string;
  createdBy?: string;
}

export interface CreateInstanceOptions {
  environment?: InstanceEnvironment;
  baseUrl?: string;
  authType?: AuthType;
  username?: string;
  password?: string;
}

export interface CreateSystemServiceOptions {
  name?: string;
  alias?: string;
  servicePath?: string;
  description?: string;
  entities?: string[];
  odataVersion?: 'v2' | 'v4';
}

export interface CreateInstanceServiceOptions {
  servicePathOverride?: string;
  entities?: string[] | null;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  entityCount?: number;
}

export interface AccessGrant {
  instanceServiceId: string;
  permissions: Record<string, string[]>;
}

export interface CreateApiKeyOptions {
  name?: string;
  description?: string;
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  expiresAt?: Date | null;
}

export const factories = {
  /**
   * Create a test organization
   */
  async createOrganization(options: CreateOrganizationOptions = {}) {
    const id = crypto.randomUUID();

    const [org] = await db.insert(organizations).values({
      id,
      name: options.name ?? `Test Organization ${uniqueId()}`,
      defaultLogLevel: options.defaultLogLevel ?? 'standard',
      logRetentionDays: options.logRetentionDays ?? 90,
    }).returning();

    // Track for cleanup
    trackOrganization(id);

    return org!;
  },

  /**
   * Create a test system
   */
  async createSystem(organizationId: string, options: CreateSystemOptions = {}) {
    const [system] = await db.insert(systems).values({
      id: crypto.randomUUID(),
      organizationId,
      name: options.name ?? `Test System ${uniqueId()}`,
      type: options.type ?? 's4_public',
      description: options.description,
      createdBy: options.createdBy,
    }).returning();

    return system!;
  },

  /**
   * Create a test instance with encrypted credentials
   */
  async createInstance(systemId: string, options: CreateInstanceOptions = {}) {
    const username = options.username ?? 'testuser';
    const password = options.password ?? 'testpass';

    const [instance] = await db.insert(instances).values({
      id: crypto.randomUUID(),
      systemId,
      environment: options.environment ?? 'dev',
      baseUrl: options.baseUrl ?? 'https://test-sap.example.com/sap/opu/odata/sap/',
      authType: options.authType ?? 'basic',
      username: options.authType === 'none' ? null : encryption.encrypt(username),
      password: options.authType === 'none' ? null : encryption.encrypt(password),
    }).returning();

    return instance!;
  },

  /**
   * Create a test system service
   */
  async createSystemService(systemId: string, options: CreateSystemServiceOptions = {}) {
    const alias = options.alias ?? `svc_${uniqueId()}`;

    const [service] = await db.insert(systemServices).values({
      id: crypto.randomUUID(),
      systemId,
      name: options.name ?? `Test Service ${alias}`,
      alias,
      servicePath: options.servicePath ?? '/sap/opu/odata/sap/API_BUSINESS_PARTNER',
      description: options.description,
      entities: options.entities ?? ['A_BusinessPartner', 'A_BusinessPartnerAddress'],
      odataVersion: options.odataVersion ?? 'v4',
    }).returning();

    return service!;
  },

  /**
   * Create a test instance service (links instance to system service)
   */
  async createInstanceService(instanceId: string, systemServiceId: string, options: CreateInstanceServiceOptions = {}) {
    const [instService] = await db.insert(instanceServices).values({
      id: crypto.randomUUID(),
      instanceId,
      systemServiceId,
      servicePathOverride: options.servicePathOverride,
      entities: options.entities,
      verificationStatus: options.verificationStatus ?? 'verified',
      entityCount: options.entityCount ?? 2,
    }).returning();

    return instService!;
  },

  /**
   * Create a test API key with access grants
   * Returns both the key record and the secret key (shown only once)
   */
  async createApiKey(
    organizationId: string,
    accessGrants: AccessGrant[] = [],
    options: CreateApiKeyOptions = {}
  ) {
    const keyId = crypto.randomUUID();
    const generated = apiKeyService.generateKey(keyId, 'live');

    const [key] = await db.insert(apiKeys).values({
      id: keyId,
      organizationId,
      name: options.name ?? `Test Key ${uniqueId()}`,
      description: options.description,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
      keyLast4: generated.keyLast4,
      rateLimitPerMinute: options.rateLimitPerMinute ?? 60,
      rateLimitPerDay: options.rateLimitPerDay ?? 10000,
      expiresAt: options.expiresAt,
    }).returning();

    // Create access grants
    for (const grant of accessGrants) {
      await db.insert(apiKeyAccess).values({
        id: crypto.randomUUID(),
        apiKeyId: keyId,
        instanceServiceId: grant.instanceServiceId,
        permissions: grant.permissions,
      });
    }

    return {
      key: key!,
      secretKey: generated.key,
      displayKey: generated.displayKey,
    };
  },

  /**
   * Create a complete test data stack:
   * Organization -> System -> Instance -> Service -> InstanceService -> API Key
   *
   * Useful for tests that need a full data hierarchy
   */
  async createTestStack(organizationId?: string) {
    // Create or use provided organization
    const org = organizationId
      ? await db.query.organizations.findFirst({ where: (o, { eq }) => eq(o.id, organizationId) })
      : await factories.createOrganization();

    if (!org) {
      throw new Error('Organization not found');
    }

    // Create system
    const system = await factories.createSystem(org.id);

    // Create dev and production instances
    const devInstance = await factories.createInstance(system.id, { environment: 'dev' });
    const prodInstance = await factories.createInstance(system.id, { environment: 'production' });

    // Create a system service
    const service = await factories.createSystemService(system.id, {
      alias: 'bp',
      name: 'Business Partner',
      entities: ['A_BusinessPartner', 'A_BusinessPartnerAddress'],
    });

    // Link service to both instances
    const devInstService = await factories.createInstanceService(devInstance.id, service.id);
    const prodInstService = await factories.createInstanceService(prodInstance.id, service.id);

    // Create an API key with access to dev instance
    const { key: apiKey, secretKey } = await factories.createApiKey(org.id, [
      {
        instanceServiceId: devInstService.id,
        permissions: { '*': ['read'] },
      },
    ]);

    return {
      organization: org,
      system,
      devInstance,
      prodInstance,
      service,
      devInstService,
      prodInstService,
      apiKey,
      secretApiKey: secretKey,
    };
  },
};
