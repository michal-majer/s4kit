import { db } from '../db';
import { services, connections, connectionServices, apiKeyAccess } from '../db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import type { Connection, Service, ConnectionService, EntityPermissions } from '../types';

export interface ResolvedAccess {
  connection: Connection;
  service: Service;
  connectionService: ConnectionService;
  permissions: EntityPermissions;
}

export const accessResolver = {
  /**
   * Find a service by entity name - ONLY among services the API key has access to
   * This prevents returning a service the API key cannot use
   */
  findServiceByEntityForApiKey: async (
    apiKeyId: string,
    organizationId: string,
    entityName: string
  ): Promise<Service | null> => {
    // Get all access grants for this API key
    const accessGrants = await db.query.apiKeyAccess.findMany({
      where: eq(apiKeyAccess.apiKeyId, apiKeyId)
    });

    if (accessGrants.length === 0) {
      return null;
    }

    // Get all connection-service records for these grants
    const connectionServiceIds = accessGrants.map(g => g.connectionServiceId);
    const connServices = await db.query.connectionServices.findMany({
      where: inArray(connectionServices.id, connectionServiceIds)
    });

    // Get unique service IDs
    const serviceIds = [...new Set(connServices.map(cs => cs.serviceId))];
    
    if (serviceIds.length === 0) {
      return null;
    }

    // Find a service that contains this entity AND is in the allowed list
    const result = await db.query.services.findFirst({
      where: and(
        eq(services.organizationId, organizationId),
        inArray(services.id, serviceIds),
        sql`${services.entities} @> ${JSON.stringify([entityName])}::jsonb`
      )
    });
    
    return result ?? null;
  },

  /**
   * Find a service by entity name (legacy - searches all services in org)
   * @deprecated Use findServiceByEntityForApiKey instead
   */
  findServiceByEntity: async (organizationId: string, entityName: string): Promise<Service | null> => {
    // Query services where entities jsonb array contains the entity name
    const result = await db.query.services.findFirst({
      where: and(
        eq(services.organizationId, organizationId),
        sql`${services.entities} @> ${JSON.stringify([entityName])}::jsonb`
      )
    });
    
    return result ?? null;
  },

  /**
   * Find a service by alias
   */
  findServiceByAlias: async (organizationId: string, alias: string): Promise<Service | null> => {
    const result = await db.query.services.findFirst({
      where: and(
        eq(services.organizationId, organizationId),
        eq(services.alias, alias)
      )
    });
    
    return result ?? null;
  },

  /**
   * Find a connection by name (used as alias in SDK)
   */
  findConnectionByName: async (organizationId: string, name: string): Promise<Connection | null> => {
    const result = await db.query.connections.findFirst({
      where: and(
        eq(connections.organizationId, organizationId),
        eq(connections.name, name)
      )
    });
    
    return result ?? null;
  },

  /**
   * Get all connections that an API key has access to, optionally filtered by service
   * Returns array of { connection, service, connectionService, permissions }
   */
  getConnectionsForApiKey: async (
    apiKeyId: string,
    organizationId: string,
    serviceId?: string
  ): Promise<Array<{
    connection: Connection;
    service: Service;
    connectionService: ConnectionService;
    permissions: EntityPermissions;
  }>> => {
    // Get all access grants for this API key
    const accessGrants = await db.query.apiKeyAccess.findMany({
      where: eq(apiKeyAccess.apiKeyId, apiKeyId)
    });

    if (accessGrants.length === 0) {
      return [];
    }

    // Get all connection-service records
    const connectionServiceIds = accessGrants.map(g => g.connectionServiceId);
    const connServices = await db.query.connectionServices.findMany({
      where: inArray(connectionServices.id, connectionServiceIds)
    });

    // Filter by service if provided
    const filteredConnServices = serviceId
      ? connServices.filter(cs => cs.serviceId === serviceId)
      : connServices;

    // Enrich with connection and service details
    const results = await Promise.all(
      filteredConnServices.map(async (connService) => {
        const [connection, service] = await Promise.all([
          db.query.connections.findFirst({
            where: and(
              eq(connections.id, connService.connectionId),
              eq(connections.organizationId, organizationId)
            )
          }),
          db.query.services.findFirst({
            where: and(
              eq(services.id, connService.serviceId),
              eq(services.organizationId, organizationId)
            )
          })
        ]);

        if (!connection || !service) {
          return null;
        }

        // Find the matching access grant
        const accessGrant = accessGrants.find(
          ag => ag.connectionServiceId === connService.id
        );

        if (!accessGrant) {
          return null;
        }

        return {
          connection,
          service,
          connectionService: connService,
          permissions: accessGrant.permissions as EntityPermissions
        };
      })
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },

  /**
   * Resolve full access grant for an API key + service combination
   * If multiple connections exist, returns the first one (or use connectionName to specify)
   * Returns the connection, service, connectionService (with auth), and permissions
   */
  resolveAccessGrantByService: async (
    apiKeyId: string,
    organizationId: string,
    serviceAlias: string,
    connectionName?: string
  ): Promise<ResolvedAccess | null> => {
    // Find the service by alias
    const service = await accessResolver.findServiceByAlias(organizationId, serviceAlias);
    if (!service) {
      return null;
    }

    // Get all connections for this API key and service
    const connections = await accessResolver.getConnectionsForApiKey(
      apiKeyId,
      organizationId,
      service.id
    );

    if (connections.length === 0) {
      return null;
    }

    // If connectionName is provided, use it to filter
    if (connectionName) {
      const matching = connections.find(c => c.connection.name === connectionName);
      if (matching) {
        return matching;
      }
      return null;
    }

    // If exactly one connection, use it
    if (connections.length === 1) {
      const result = connections[0];
      if (result) {
        return result;
      }
    }

    // Multiple connections but no name specified - return null (caller should handle)
    return null;
  },

  /**
   * Resolve full access grant for an API key + connection + service combination
   * Returns the connection, service, connectionService (with auth), and permissions
   */
  resolveAccessGrant: async (
    apiKeyId: string,
    organizationId: string,
    connectionName: string,
    serviceAlias: string
  ): Promise<ResolvedAccess | null> => {
    // Find the connection by name
    const connection = await accessResolver.findConnectionByName(organizationId, connectionName);
    if (!connection) {
      return null;
    }

    // Find the service by alias
    const service = await accessResolver.findServiceByAlias(organizationId, serviceAlias);
    if (!service) {
      return null;
    }

    // Find the connectionService junction record
    const connService = await db.query.connectionServices.findFirst({
      where: and(
        eq(connectionServices.connectionId, connection.id),
        eq(connectionServices.serviceId, service.id)
      )
    });

    if (!connService) {
      return null;
    }

    // Find the API key access grant for this connection+service
    const accessGrant = await db.query.apiKeyAccess.findFirst({
      where: and(
        eq(apiKeyAccess.apiKeyId, apiKeyId),
        eq(apiKeyAccess.connectionServiceId, connService.id)
      )
    });

    if (!accessGrant) {
      return null;
    }

    return {
      connection,
      service,
      connectionService: connService,
      permissions: accessGrant.permissions as EntityPermissions
    };
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
  }
};
