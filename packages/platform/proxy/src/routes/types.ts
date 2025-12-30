/**
 * Types generation route for SDK clients
 * Allows API key holders to generate TypeScript types for their accessible entities
 */

import { Hono } from 'hono';
import { db } from '../index.ts';
import { apiKeyAccess, instanceServices, instances, systemServices, eq } from '@s4kit/shared/db';
import { apiKeyService } from '../services/api-key.ts';
import { metadataParser, type ODataEntityType } from '../services/metadata-parser.ts';
import { generateTypeScriptFile, filterEntityTypes } from '../services/type-generator.ts';
import type { Instance, SystemService, InstanceService } from '../types.ts';

const app = new Hono();

/**
 * Resolve auth configuration with inheritance logic
 */
function resolveAuth(instance: Instance, systemService: SystemService, instanceService: InstanceService) {
  if (instanceService.authType) {
    return {
      type: instanceService.authType,
      username: instanceService.username,
      password: instanceService.password,
      config: instanceService.authConfig,
      credentials: instanceService.credentials,
    };
  }
  if (systemService.authType) {
    return {
      type: systemService.authType,
      username: systemService.username,
      password: systemService.password,
      config: systemService.authConfig,
      credentials: systemService.credentials,
    };
  }
  return {
    type: instance.authType,
    username: instance.username,
    password: instance.password,
    config: instance.authConfig,
    credentials: instance.credentials,
  };
}

/**
 * GET /api/proxy/$types
 * Generate TypeScript types for all entities accessible via the API key
 */
app.get('/', async (c) => {
  // Validate API key
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const key = authHeader.split(' ')[1];

  if (!key) {
    return c.json({ error: 'Missing API key' }, 401);
  }

  const validationResult = await apiKeyService.validateKey(key);

  if (!validationResult.valid || !validationResult.apiKey) {
    return c.json({ error: validationResult.error || 'Invalid or expired API key' }, 401);
  }

  const apiKey = validationResult.apiKey;

  // Get all access grants for this API key
  const grants = await db.query.apiKeyAccess.findMany({
    where: eq(apiKeyAccess.apiKeyId, apiKey.id)
  });

  if (grants.length === 0) {
    return c.json({ error: 'No access grants found for this API key' }, 404);
  }

  // Collect all entity types and entities from all grants
  const allEntityTypes: ODataEntityType[] = [];
  const allEntities: { name: string; entityType?: string }[] = [];
  const errors: string[] = [];

  // Process each access grant
  for (const grant of grants) {
    try {
      // Resolve instanceService
      const instService = await db.query.instanceServices.findFirst({
        where: eq(instanceServices.id, grant.instanceServiceId)
      });

      if (!instService) {
        errors.push(`Instance service ${grant.instanceServiceId} not found`);
        continue;
      }

      // Resolve instance and systemService
      const [inst, svc] = await Promise.all([
        db.query.instances.findFirst({ where: eq(instances.id, instService.instanceId) }),
        db.query.systemServices.findFirst({ where: eq(systemServices.id, instService.systemServiceId) })
      ]);

      if (!inst || !svc) {
        errors.push(`Instance or system service not found for grant ${grant.id}`);
        continue;
      }

      // Resolve auth configuration
      const authConfig = resolveAuth(inst, svc, instService);

      // Determine service path
      const servicePath = instService.servicePathOverride || svc.servicePath;

      // Fetch full metadata
      const metadataResult = await metadataParser.fetchFullMetadata({
        baseUrl: inst.baseUrl,
        servicePath,
        auth: authConfig,
      });

      if (metadataResult.error) {
        errors.push(`Failed to fetch metadata for service ${svc.alias}: ${metadataResult.error}`);
        continue;
      }

      // Get allowed entities from permissions
      const allowedEntities = Object.keys(grant.permissions);

      // Filter entity types based on permissions
      const filteredTypes = filterEntityTypes(
        metadataResult.entityTypes,
        allowedEntities,
        grant.permissions
      );

      // Add to collection (avoid duplicates by fullName)
      for (const entityType of filteredTypes) {
        if (!allEntityTypes.find(et => et.fullName === entityType.fullName)) {
          allEntityTypes.push(entityType);
        }
      }

      // Add entity sets (for module augmentation property names)
      for (const entity of metadataResult.entities) {
        if (!allEntities.find(e => e.name === entity.name)) {
          allEntities.push(entity);
        }
      }
    } catch (error: any) {
      errors.push(`Error processing grant ${grant.id}: ${error.message}`);
      console.error(`Error processing grant ${grant.id}:`, error);
    }
  }

  // Generate TypeScript file
  const typeScriptContent = generateTypeScriptFile(allEntityTypes, {
    apiKeyId: apiKey.id,
    apiKeyName: apiKey.name,
    generatedAt: new Date(),
    entities: allEntities,
  });

  // If there were errors but we still have some types, include them in a comment
  let finalContent = typeScriptContent;
  if (errors.length > 0) {
    const errorComment = `\n\n/*\n * Warnings during generation:\n${errors.map(e => ` * - ${e}`).join('\n')}\n */\n`;
    finalContent = typeScriptContent + errorComment;
  }

  // Return as .d.ts file
  const filename = `s4kit-types.d.ts`;

  return c.text(finalContent, 200, {
    'Content-Type': 'application/typescript',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
});

export default app;
