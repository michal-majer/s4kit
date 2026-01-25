import { createMiddleware } from 'hono/factory';
import { apiKeyService } from '../services/api-key.ts';
import { accessResolver } from '../services/access-resolver.ts';
import type { Variables } from '../types.ts';

// Helper to extract client IP from request
function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string | undefined {
  // Check common proxy headers
  return (
    c.req.header('CF-Connecting-IP') || // Cloudflare
    c.req.header('X-Real-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
  );
}

// Helper to extract entity name from path
function extractEntityFromPath(path: string): string | null {
  // Strip /api/proxy/ prefix and extract entity name
  // e.g., /api/proxy/A_BusinessPartner('123') -> A_BusinessPartner
  const cleanPath = path.replace(/^\/api\/proxy\/?/, '');
  const match = cleanPath.match(/^([A-Za-z0-9_]+)/);
  return match?.[1] ?? null;
}

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  // 1. Validate API key
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const key = authHeader.split(' ')[1];

  if (!key) {
    return c.json({ error: 'Missing API key' }, 401);
  }

  const clientIp = getClientIp(c);
  const validationResult = await apiKeyService.validateKey(key, clientIp);

  if (!validationResult.valid || !validationResult.apiKey) {
    return c.json({ error: validationResult.error || 'Invalid or expired API key' }, 401);
  }

  const apiKey = validationResult.apiKey;

  // 2. Get service from header OR resolve from entity name
  const serviceAliasHeader = c.req.header('X-S4Kit-Service');
  let serviceIdOrAlias: string;
  let resolvedServiceAlias: string;

  if (serviceAliasHeader) {
    // Use explicit service alias from header
    serviceIdOrAlias = serviceAliasHeader;
    resolvedServiceAlias = serviceAliasHeader;
  } else {
    // Extract entity name from path and resolve service
    const entityName = extractEntityFromPath(c.req.path);

    if (!entityName) {
      return c.json({ error: 'Could not determine entity from path' }, 400);
    }

    // Lookup service that contains this entity - ONLY among services this API key has access to
    const service = await accessResolver.findServiceByEntityForApiKey(apiKey.id, apiKey.organizationId, entityName);
    if (!service) {
      return c.json({ error: `Unknown entity '${entityName}' - not registered in any service you have access to` }, 404);
    }
    // Use the service ID to ensure we resolve the correct service (not another with same alias)
    serviceIdOrAlias = service.id;
    resolvedServiceAlias = service.alias;
  }

  // 3. Get instance environment from header (optional - used as override if API key has multiple instances)
  const instanceEnvironment = c.req.header('X-S4Kit-Instance');

  // 4. Resolve instance + service + access grant from API key
  const accessGrant = await accessResolver.resolveAccessGrantByService(
    apiKey.id,
    apiKey.organizationId,
    serviceIdOrAlias,
    instanceEnvironment
  );

  if (!accessGrant) {
    if (instanceEnvironment) {
      return c.json({
        error: `No access to instance '${instanceEnvironment}' + service '${resolvedServiceAlias}'`
      }, 403);
    } else {
      return c.json({
        error: `No access to service '${resolvedServiceAlias}' for this API key`
      }, 403);
    }
  }

  // Attach validated data to context
  c.set('apiKey', apiKey);
  c.set('instance', accessGrant.instance);
  c.set('systemService', accessGrant.systemService);
  c.set('instanceService', accessGrant.instanceService);
  c.set('entityPermissions', accessGrant.permissions);

  await next();
});
