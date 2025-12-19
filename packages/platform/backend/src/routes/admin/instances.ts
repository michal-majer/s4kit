import { Hono } from 'hono';
import { db } from '../../db';
import { instances } from '../../db/schema';
import { encryption } from '../../services/encryption';
import { z } from 'zod';
import { desc, eq, and } from 'drizzle-orm';

const app = new Hono();

const instanceSchema = z.object({
  systemId: z.string().uuid(),
  environment: z.enum(['dev', 'quality', 'production']),
  baseUrl: z.string().url(),
  authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).default('basic'),
  
  // Basic auth fields
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  
  // API Key auth fields
  apiKey: z.string().min(1).optional(),
  apiKeyHeaderName: z.string().optional(),
  
  // OAuth2 auth fields
  oauth2ClientId: z.string().min(1).optional(),
  oauth2ClientSecret: z.string().min(1).optional(),
  oauth2TokenUrl: z.string().url().optional(),
  oauth2Scope: z.string().optional(),
  oauth2AuthorizationUrl: z.string().url().optional(),
  
  // Custom auth fields
  customHeaderName: z.string().min(1).optional(),
  customHeaderValue: z.string().min(1).optional(),
  authConfig: z.any().optional(),
  credentials: z.any().optional(),
}).refine((data) => {
  if (data.authType === 'none') return true;
  if (data.authType === 'basic') return !!(data.username && data.password);
  if (data.authType === 'api_key') return !!data.apiKey;
  if (data.authType === 'oauth2') return !!(data.oauth2ClientId && data.oauth2ClientSecret && data.oauth2TokenUrl);
  if (data.authType === 'custom') return !!(data.customHeaderName && data.customHeaderValue);
  return true;
}, {
  message: 'Required authentication fields are missing for the selected auth type',
  path: ['authType']
});

// List instances (optionally by systemId)
app.get('/', async (c) => {
  const systemId = c.req.query('systemId');
  
  const allInstances = await db.query.instances.findMany({
    where: systemId ? eq(instances.systemId, systemId) : undefined,
    orderBy: [desc(instances.createdAt)]
  });
  
  // Don't return secrets
  const safeInstances = allInstances.map(({ username, password, credentials, ...rest }) => rest);
  return c.json(safeInstances);
});

// Create instance
app.post('/', async (c) => {
  const body = await c.req.json();
  const result = instanceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { 
    username, 
    password, 
    authType, 
    apiKey,
    apiKeyHeaderName,
    oauth2ClientId,
    oauth2ClientSecret,
    oauth2TokenUrl,
    oauth2Scope,
    oauth2AuthorizationUrl,
    customHeaderName,
    customHeaderValue,
    authConfig,
    credentials,
    ...data 
  } = result.data;

  const instanceData: any = {
    ...data,
    authType: authType as any,
  };

  // Store credentials based on auth type
  if (authType === 'basic' && username && password) {
    instanceData.username = encryption.encrypt(username);
    instanceData.password = encryption.encrypt(password);
  } else if (authType === 'api_key' && apiKey) {
    instanceData.authConfig = {
      headerName: apiKeyHeaderName || 'X-API-Key',
    };
    instanceData.credentials = {
      apiKey: encryption.encrypt(apiKey),
    };
  } else if (authType === 'oauth2') {
    instanceData.authConfig = {
      tokenUrl: oauth2TokenUrl,
      scope: oauth2Scope,
      authorizationUrl: oauth2AuthorizationUrl,
      clientId: oauth2ClientId,
    };
    instanceData.credentials = {
      clientSecret: oauth2ClientSecret ? encryption.encrypt(oauth2ClientSecret) : undefined,
    };
  } else if (authType === 'custom') {
    if (customHeaderName && customHeaderValue) {
      instanceData.authConfig = {
        headerName: customHeaderName,
      };
      instanceData.credentials = {
        headerValue: encryption.encrypt(customHeaderValue),
      };
    } else if (authConfig) {
      instanceData.authConfig = authConfig;
      if (credentials) {
        const encryptedCredentials: any = {};
        for (const [key, value] of Object.entries(credentials)) {
          if (typeof value === 'string' && (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password'))) {
            encryptedCredentials[key] = encryption.encrypt(value);
          } else {
            encryptedCredentials[key] = value;
          }
        }
        instanceData.credentials = encryptedCredentials;
      }
    }
  }

  const [newInstance] = await db.insert(instances).values(instanceData).returning();

  if (!newInstance) {
    return c.json({ error: 'Failed to create instance' }, 500);
  }

  const { username: _, password: __, credentials: ___, ...safeInstance } = newInstance;
  return c.json(safeInstance, 201);
});

// Get single instance
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const instance = await db.query.instances.findFirst({
    where: eq(instances.id, id)
  });
  
  if (!instance) {
    return c.json({ error: 'Instance not found' }, 404);
  }
  
  const { username, password, credentials, ...safeInstance } = instance;
  return c.json(safeInstance);
});

// Update instance
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const updateSchema = z.object({
    baseUrl: z.string().url().optional(),
    authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    apiKey: z.string().min(1).optional(),
    apiKeyHeaderName: z.string().optional(),
    oauth2ClientId: z.string().min(1).optional(),
    oauth2ClientSecret: z.string().min(1).optional(),
    oauth2TokenUrl: z.string().url().optional(),
    oauth2Scope: z.string().optional(),
    oauth2AuthorizationUrl: z.string().url().optional(),
    customHeaderName: z.string().min(1).optional(),
    customHeaderValue: z.string().min(1).optional(),
    authConfig: z.any().optional(),
    credentials: z.any().optional(),
  });
  
  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { 
    username, 
    password, 
    authType,
    apiKey,
    apiKeyHeaderName,
    oauth2ClientId,
    oauth2ClientSecret,
    oauth2TokenUrl,
    oauth2Scope,
    oauth2AuthorizationUrl,
    customHeaderName,
    customHeaderValue,
    authConfig,
    credentials,
    ...data 
  } = result.data;

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };

  if (authType !== undefined) {
    updateData.authType = authType;
  }

  const finalAuthType = authType;
  
  if (finalAuthType === 'none') {
    updateData.username = null;
    updateData.password = null;
    updateData.authConfig = null;
    updateData.credentials = null;
  } else if (finalAuthType === 'basic' || (finalAuthType === undefined && (username !== undefined || password !== undefined))) {
    if (username !== undefined) updateData.username = encryption.encrypt(username);
    if (password !== undefined) updateData.password = encryption.encrypt(password);
  } else if (finalAuthType === 'api_key' && apiKey !== undefined) {
    updateData.authConfig = { headerName: apiKeyHeaderName || 'X-API-Key' };
    updateData.credentials = { apiKey: encryption.encrypt(apiKey) };
  } else if (finalAuthType === 'oauth2' && (oauth2ClientId !== undefined || oauth2ClientSecret !== undefined || oauth2TokenUrl !== undefined)) {
    const existingInstance = await db.query.instances.findFirst({ where: eq(instances.id, id) });
    const currentAuthConfig = existingInstance?.authConfig as any || {};
    const currentCredentials = existingInstance?.credentials as any || {};
    
    updateData.authConfig = {
      ...currentAuthConfig,
      tokenUrl: oauth2TokenUrl !== undefined ? oauth2TokenUrl : currentAuthConfig.tokenUrl,
      scope: oauth2Scope !== undefined ? oauth2Scope : currentAuthConfig.scope,
      authorizationUrl: oauth2AuthorizationUrl !== undefined ? oauth2AuthorizationUrl : currentAuthConfig.authorizationUrl,
      clientId: oauth2ClientId !== undefined ? oauth2ClientId : currentAuthConfig.clientId,
    };
    
    if (oauth2ClientSecret !== undefined) {
      updateData.credentials = { ...currentCredentials, clientSecret: encryption.encrypt(oauth2ClientSecret) };
    }
  } else if (finalAuthType === 'custom') {
    if (customHeaderName !== undefined || customHeaderValue !== undefined) {
      const existingInstance = await db.query.instances.findFirst({ where: eq(instances.id, id) });
      const currentAuthConfig = existingInstance?.authConfig as any || {};
      
      if (customHeaderName !== undefined) {
        updateData.authConfig = {
          ...currentAuthConfig,
          headerName: customHeaderName,
        };
      }
      
      if (customHeaderValue !== undefined) {
        const currentCredentials = existingInstance?.credentials as any || {};
        updateData.credentials = {
          ...currentCredentials,
          headerValue: encryption.encrypt(customHeaderValue),
        };
      }
    } else if (authConfig !== undefined) {
      updateData.authConfig = authConfig;
      if (credentials !== undefined) {
        const encryptedCredentials: any = {};
        for (const [key, value] of Object.entries(credentials)) {
          if (typeof value === 'string' && (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password'))) {
            encryptedCredentials[key] = encryption.encrypt(value);
          } else {
            encryptedCredentials[key] = value;
          }
        }
        updateData.credentials = encryptedCredentials;
      }
    }
  }

  const [updated] = await db.update(instances)
    .set(updateData)
    .where(eq(instances.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  const { username: _, password: __, credentials: ___, ...safeInstance } = updated;
  return c.json(safeInstance);
});

// Delete instance
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db.delete(instances)
    .where(eq(instances.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  return c.json({ success: true });
});

export default app;
