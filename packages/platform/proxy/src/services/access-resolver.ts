import { db, redis } from '../index.ts';
import { systemServices, instances, instanceServices, apiKeyAccess, systems, eq, and, inArray } from '@s4kit/shared/db';
import type { Instance, SystemService, InstanceService, EntityPermissions } from '../types.ts';

// Cache TTL in seconds
const ACCESS_CACHE_TTL = 30; // 30 seconds

// Environment priority (highest level first)
const ENVIRONMENT_PRIORITY: Record<string, number> = {
  production: 5,
  preprod: 4,
  quality: 3,
  dev: 2,
  sandbox: 1
};

export interface ResolvedAccess {
  instance: Instance;
  systemService: SystemService;
  instanceService: InstanceService;
  permissions: EntityPermissions;
}

export const accessResolver = {
  /**
   * Find a service by entity name - ONLY among services the API key has access to
   */
  findServiceByEntityForApiKey: async (
    apiKeyId: string,
    organizationId: string,
    entityName: string
  ): Promise<SystemService | null> => {
    // Get all access grants for this API key
    const accessGrants = await db.query.apiKeyAccess.findMany({
      where: eq(apiKeyAccess.apiKeyId, apiKeyId)
    });

    if (accessGrants.length === 0) {
      return null;
    }

    // Get all instance-service records for these grants
    const instanceServiceIds = accessGrants.map(g => g.instanceServiceId);
    const instServices = await db.query.instanceServices.findMany({
      where: inArray(instanceServices.id, instanceServiceIds)
    });

    // Get unique system service IDs
    const systemServiceIds = [...new Set(instServices.map(is => is.systemServiceId))];

    if (systemServiceIds.length === 0) {
      return null;
    }

    // Get the system services and their systems to verify organization
    const sysServices = await db.query.systemServices.findMany({
      where: inArray(systemServices.id, systemServiceIds)
    });

    // Filter to only services belonging to systems in this organization
    const systemIds = [...new Set(sysServices.map(ss => ss.systemId))];
    const syss = await db.query.systems.findMany({
      where: and(
        inArray(systems.id, systemIds),
        eq(systems.organizationId, organizationId)
      )
    });
    const validSystemIds = new Set(syss.map(s => s.id));
    const validServiceIds = sysServices
      .filter(ss => validSystemIds.has(ss.systemId))
      .map(ss => ss.id);

    // Check each instance-service to see if it contains the entity
    // Priority: instanceService.entities > systemService.entities
    for (const instService of instServices) {
      // Skip if this instance-service's system service is not in valid list
      if (!validServiceIds.includes(instService.systemServiceId)) {
        continue;
      }

      // Get the system service
      const sysService = sysServices.find(ss => ss.id === instService.systemServiceId);
      if (!sysService) {
        continue;
      }

      // Check entities: instanceService.entities first, then fall back to systemService.entities
      const entitiesToCheck = instService.entities !== null
        ? instService.entities
        : (sysService.entities || []);

      if (entitiesToCheck.includes(entityName)) {
        return sysService;
      }
    }

    return null;
  },

  /**
   * Find a service by alias within an organization
   */
  findServiceByAlias: async (organizationId: string, alias: string): Promise<SystemService | null> => {
    // Get all systems for this organization
    const syss = await db.query.systems.findMany({
      where: eq(systems.organizationId, organizationId)
    });

    if (syss.length === 0) {
      return null;
    }

    const systemIds = syss.map(s => s.id);

    const result = await db.query.systemServices.findFirst({
      where: and(
        inArray(systemServices.systemId, systemIds),
        eq(systemServices.alias, alias)
      )
    });

    return result ?? null;
  },

  /**
   * Get all instances that an API key has access to, optionally filtered by service
   */
  getInstancesForApiKey: async (
    apiKeyId: string,
    organizationId: string,
    systemServiceId?: string
  ): Promise<Array<{
    instance: Instance;
    systemService: SystemService;
    instanceService: InstanceService;
    permissions: EntityPermissions;
  }>> => {
    // Get all access grants for this API key
    const accessGrants = await db.query.apiKeyAccess.findMany({
      where: eq(apiKeyAccess.apiKeyId, apiKeyId)
    });

    if (accessGrants.length === 0) {
      return [];
    }

    // Get all instance-service records
    const instanceServiceIds = accessGrants.map(g => g.instanceServiceId);
    const instServices = await db.query.instanceServices.findMany({
      where: inArray(instanceServices.id, instanceServiceIds)
    });

    // Filter by service if provided
    const filteredInstServices = systemServiceId
      ? instServices.filter(is => is.systemServiceId === systemServiceId)
      : instServices;

    // Enrich with instance and service details
    const results = await Promise.all(
      filteredInstServices.map(async (instService) => {
        const [instance, sysService] = await Promise.all([
          db.query.instances.findFirst({
            where: eq(instances.id, instService.instanceId)
          }),
          db.query.systemServices.findFirst({
            where: eq(systemServices.id, instService.systemServiceId)
          })
        ]);

        if (!instance || !sysService) {
          return null;
        }

        // Verify system belongs to organization
        const system = await db.query.systems.findFirst({
          where: and(
            eq(systems.id, sysService.systemId),
            eq(systems.organizationId, organizationId)
          )
        });

        if (!system) {
          return null;
        }

        // Find the matching access grant
        const accessGrant = accessGrants.find(
          ag => ag.instanceServiceId === instService.id
        );

        if (!accessGrant) {
          return null;
        }

        return {
          instance,
          systemService: sysService,
          instanceService: instService,
          permissions: accessGrant.permissions as EntityPermissions
        };
      })
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },

  /**
   * Resolve full access grant for an API key + service combination
   * If multiple instances exist, returns null unless instanceId is specified
   */
  resolveAccessGrantByService: async (
    apiKeyId: string,
    organizationId: string,
    serviceAlias: string,
    instanceEnvironment?: string
  ): Promise<ResolvedAccess | null> => {
    // Check cache first
    const cacheKey = `access:${apiKeyId}:${serviceAlias}:${instanceEnvironment || 'default'}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached) as ResolvedAccess;
      } catch {
        await redis.del(cacheKey);
      }
    }

    // Find the service by alias
    const sysService = await accessResolver.findServiceByAlias(organizationId, serviceAlias);
    if (!sysService) {
      return null;
    }

    // Get all instances for this API key and service
    const instAccess = await accessResolver.getInstancesForApiKey(
      apiKeyId,
      organizationId,
      sysService.id
    );

    if (instAccess.length === 0) {
      return null;
    }

    let result: ResolvedAccess | null = null;

    // If instanceEnvironment is provided, use it to filter
    if (instanceEnvironment) {
      const matching = instAccess.find(ia => ia.instance.environment === instanceEnvironment);
      if (matching) {
        result = matching;
      }
    } else if (instAccess.length === 1) {
      // If exactly one instance, use it
      const first = instAccess[0];
      if (first) {
        result = first;
      }
    } else if (instAccess.length > 1) {
      // Multiple instances available - pick the highest level one
      const sorted = [...instAccess].sort((a, b) => {
        const priorityA = ENVIRONMENT_PRIORITY[a.instance.environment] ?? 0;
        const priorityB = ENVIRONMENT_PRIORITY[b.instance.environment] ?? 0;
        return priorityB - priorityA; // Descending order (highest first)
      });
      result = sorted[0] ?? null;
    }

    // Cache the result
    if (result) {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', ACCESS_CACHE_TTL);
    }

    return result;
  },

  /**
   * Check if an entity operation is allowed based on permissions
   */
  checkEntityPermission: (
    permissions: EntityPermissions,
    entityName: string,
    operation: string
  ): boolean => {
    // Check specific entity permissions
    const entityPerms = permissions[entityName];
    if (entityPerms) {
      if (entityPerms.includes('*') || entityPerms.includes(operation)) {
        return true;
      }
    }

    // Check wildcard permissions
    const wildcardPerms = permissions['*'];
    if (wildcardPerms) {
      if (wildcardPerms.includes('*') || wildcardPerms.includes(operation)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Map HTTP method to operation name
   */
  methodToOperation: (method: string): string => {
    const map: Record<string, string> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete'
    };
    return map[method.toUpperCase()] || 'read';
  },

  /**
   * Invalidate cached access grant
   * Called by admin service when access is modified
   */
  invalidateCache: async (apiKeyId: string): Promise<void> => {
    // Delete all cached access grants for this API key
    const pattern = `access:${apiKeyId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};
