import { createMiddleware } from 'hono/factory';
import { apiKeyService } from '../services/api-key';
import { accessResolver } from '../services/access-resolver';

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
  // e.g., /api/proxy/A_BusinessPartner('123') → A_BusinessPartner
  const cleanPath = path.replace(/^\/api\/proxy\/?/, '');
  const match = cleanPath.match(/^([A-Za-z0-9_]+)/);
  return match?.[1] ?? null;
}

export const authMiddleware = createMiddleware(async (c, next) => {
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
  let serviceAlias = c.req.header('X-S4Kit-Service');
  
  if (!serviceAlias) {
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
    serviceAlias = service.alias;
  }

  // 3. Get instance environment from header (optional - used as override if API key has multiple instances)
  const instanceEnvironment = c.req.header('X-S4Kit-Instance');

  // 4. Resolve instance + service + access grant from API key
  const accessGrant = await accessResolver.resolveAccessGrantByService(
    apiKey.id,
    apiKey.organizationId,
    serviceAlias,
    instanceEnvironment
  );
  
  if (!accessGrant) {
    if (instanceEnvironment) {
      return c.json({ 
        error: `No access to instance '${instanceEnvironment}' + service '${serviceAlias}'` 
      }, 403);
    } else {
      // Get all instances for this API key and service to provide a helpful error
      const service = await accessResolver.findServiceByAlias(apiKey.organizationId, serviceAlias);
      if (service) {
        const instances = await accessResolver.getInstancesForApiKey(
          apiKey.id,
          apiKey.organizationId,
          service.id
        );
        
        if (instances.length === 0) {
          return c.json({ 
            error: `No access to service '${serviceAlias}' for this API key` 
          }, 403);
        } else if (instances.length > 1) {
          const envs = instances.map(i => i.instance.environment).join(', ');
          return c.json({ 
            error: `Multiple instances available for service '${serviceAlias}'. Please specify X-S4Kit-Instance header. Available: ${envs}` 
          }, 400);
        }
      }
      
      return c.json({ 
        error: `No access to service '${serviceAlias}'` 
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
