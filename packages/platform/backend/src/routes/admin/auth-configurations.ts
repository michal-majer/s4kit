import { Hono } from 'hono';
import { db, authConfigurations, instances, systemServices, instanceServices } from '../../db';
import { encryption } from '@s4kit/shared/services';
import { z } from 'zod';
import { desc, eq, and, count, or } from 'drizzle-orm';
import { requirePermission, type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

// Base Zod schema for auth configuration fields (no refinement)
const authConfigBaseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional().nullable(),
  authType: z.enum(['none', 'basic', 'oauth2', 'custom']).default('basic'),

  // Basic auth fields
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),

  // OAuth2 auth fields
  oauth2ClientId: z.string().min(1).optional(),
  oauth2ClientSecret: z.string().min(1).optional(),
  oauth2TokenUrl: z.string().url().optional(),
  oauth2Scope: z.string().optional(),
  oauth2AuthorizationUrl: z.string().url().optional(),

  // Custom Header auth fields
  customHeaderName: z.string().min(1).optional(),
  customHeaderValue: z.string().min(1).optional(),

  // Raw config/credentials (for advanced use cases)
  authConfig: z.any().optional(),
  credentials: z.any().optional(),
});

// Schema for creating auth configurations (requires credentials)
const authConfigSchema = authConfigBaseSchema.refine((data) => {
  if (data.authType === 'none') return true;
  if (data.authType === 'basic') return !!(data.username && data.password);
  if (data.authType === 'oauth2') return !!(data.oauth2ClientId && data.oauth2ClientSecret && data.oauth2TokenUrl);
  if (data.authType === 'custom') return !!(data.customHeaderName && data.customHeaderValue) || !!(data.authConfig && data.credentials);
  return true;
}, {
  message: 'Required authentication fields are missing for the selected auth type',
  path: ['authType']
});

// Schema for updating auth configurations (credentials are optional - preserves existing if not provided)
const authConfigUpdateSchema = authConfigBaseSchema.partial();

// Helper to build auth config and credentials from form data
function buildAuthData(data: z.infer<typeof authConfigSchema>) {
  const {
    authType,
    username,
    password,
    oauth2ClientId,
    oauth2ClientSecret,
    oauth2TokenUrl,
    oauth2Scope,
    oauth2AuthorizationUrl,
    customHeaderName,
    customHeaderValue,
    authConfig,
    credentials,
    ...rest
  } = data;

  const result: any = {
    ...rest,
    authType,
    username: null,
    password: null,
    authConfig: null,
    credentials: null,
  };

  if (authType === 'basic' && username && password) {
    result.username = encryption.encrypt(username.trim());
    result.password = encryption.encrypt(password.trim());
  } else if (authType === 'oauth2') {
    result.authConfig = {
      tokenUrl: oauth2TokenUrl?.trim(),
      scope: oauth2Scope?.trim(),
      authorizationUrl: oauth2AuthorizationUrl?.trim(),
      clientId: oauth2ClientId?.trim(),
    };
    result.credentials = {
      clientSecret: oauth2ClientSecret ? encryption.encrypt(oauth2ClientSecret.trim()) : undefined,
    };
  } else if (authType === 'custom') {
    if (customHeaderName && customHeaderValue) {
      result.authConfig = {
        headerName: customHeaderName.trim(),
      };
      result.credentials = {
        headerValue: encryption.encrypt(customHeaderValue.trim()),
      };
    } else if (authConfig) {
      result.authConfig = authConfig;
      if (credentials) {
        const encryptedCredentials: any = {};
        for (const [key, value] of Object.entries(credentials)) {
          const trimmedValue = typeof value === 'string' ? value.trim() : value;
          if (typeof trimmedValue === 'string' && (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password'))) {
            encryptedCredentials[key] = encryption.encrypt(trimmedValue);
          } else {
            encryptedCredentials[key] = trimmedValue;
          }
        }
        result.credentials = encryptedCredentials;
      }
    }
  }

  return result;
}

/**
 * Build update data that preserves existing secrets when not provided
 */
function buildAuthDataForUpdate(
  data: z.infer<typeof authConfigUpdateSchema>,
  existing: typeof authConfigurations.$inferSelect
) {
  const updateFields: any = {
    updatedAt: new Date(),
  };

  // Update non-secret fields if provided
  if (data.name !== undefined) updateFields.name = data.name;
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.authType !== undefined) updateFields.authType = data.authType;

  const authType = data.authType ?? existing.authType;

  // Handle auth type-specific updates
  if (authType === 'none') {
    // Clear all auth data for 'none' type
    updateFields.username = null;
    updateFields.password = null;
    updateFields.authConfig = null;
    updateFields.credentials = null;
  } else if (authType === 'basic') {
    // Only update username if provided
    if (data.username) {
      updateFields.username = encryption.encrypt(data.username.trim());
    }
    // Only update password if provided
    if (data.password) {
      updateFields.password = encryption.encrypt(data.password.trim());
    }
    // Clear other auth types' data when changing to basic
    if (data.authType && data.authType !== existing.authType) {
      updateFields.authConfig = null;
      updateFields.credentials = null;
    }
  } else if (authType === 'oauth2') {
    // Build authConfig with updates, preserving existing values
    const existingAuthConfig = (existing.authConfig as any) || {};
    updateFields.authConfig = {
      tokenUrl: data.oauth2TokenUrl?.trim() ?? existingAuthConfig.tokenUrl,
      scope: data.oauth2Scope !== undefined ? data.oauth2Scope?.trim() : existingAuthConfig.scope,
      authorizationUrl: data.oauth2AuthorizationUrl?.trim() ?? existingAuthConfig.authorizationUrl,
      clientId: data.oauth2ClientId?.trim() ?? existingAuthConfig.clientId,
    };
    // Only update clientSecret if provided
    if (data.oauth2ClientSecret) {
      updateFields.credentials = {
        clientSecret: encryption.encrypt(data.oauth2ClientSecret.trim()),
      };
    }
    // Clear basic auth data when changing to oauth2
    if (data.authType && data.authType !== existing.authType) {
      updateFields.username = null;
      updateFields.password = null;
    }
  } else if (authType === 'custom') {
    // Build authConfig
    const existingAuthConfig = (existing.authConfig as any) || {};
    if (data.customHeaderName || existingAuthConfig.headerName) {
      updateFields.authConfig = {
        headerName: data.customHeaderName?.trim() ?? existingAuthConfig.headerName,
      };
    }
    // Only update headerValue if provided
    if (data.customHeaderValue) {
      updateFields.credentials = {
        headerValue: encryption.encrypt(data.customHeaderValue.trim()),
      };
    }
    // Clear other auth data when changing to custom
    if (data.authType && data.authType !== existing.authType) {
      updateFields.username = null;
      updateFields.password = null;
    }
  }

  return updateFields;
}

// Safe representation (without secrets)
function toSafeAuthConfig(config: typeof authConfigurations.$inferSelect) {
  const { username, password, credentials, ...safe } = config;
  return {
    ...safe,
    hasCredentials: !!(username || password || credentials),
  };
}

// List auth configurations for organization
app.get('/', requirePermission('system:read'), async (c) => {
  const organizationId = c.get('organizationId')!;

  const configs = await db.query.authConfigurations.findMany({
    where: eq(authConfigurations.organizationId, organizationId),
    orderBy: [desc(authConfigurations.createdAt)],
  });

  return c.json(configs.map(toSafeAuthConfig));
});

// Create auth configuration
app.post('/', requirePermission('system:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();
  const result = authConfigSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const authData = buildAuthData(result.data);

  // Check if config with same name already exists (to avoid relying on DB constraint catch)
  const existing = await db.query.authConfigurations.findFirst({
    where: and(
      eq(authConfigurations.organizationId, organizationId),
      eq(authConfigurations.name, result.data.name)
    ),
  });

  if (existing) {
    return c.json({ error: 'An auth configuration with this name already exists' }, 409);
  }

  try {
    const [newConfig] = await db.insert(authConfigurations).values({
      ...authData,
      organizationId,
    }).returning();

    if (!newConfig) {
      return c.json({ error: 'Failed to create auth configuration' }, 500);
    }

    return c.json(toSafeAuthConfig(newConfig), 201);
  } catch (error: any) {
    // Handle unique constraint violation as fallback
    const errorCode = String(error?.code || '');
    const errorMessage = String(error?.message || '');

    if (errorCode === '23505' || errorMessage.includes('duplicate')) {
      return c.json({ error: 'An auth configuration with this name already exists' }, 409);
    }
    console.error('Failed to create auth configuration:', error);
    throw error;
  }
});

// Get single auth configuration
app.get('/:id', requirePermission('system:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');

  const config = await db.query.authConfigurations.findFirst({
    where: and(
      eq(authConfigurations.id, id),
      eq(authConfigurations.organizationId, organizationId)
    ),
  });

  if (!config) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  return c.json(toSafeAuthConfig(config));
});

// Update auth configuration
app.patch('/:id', requirePermission('system:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');
  const body = await c.req.json();

  // Verify config belongs to organization
  const existing = await db.query.authConfigurations.findFirst({
    where: and(
      eq(authConfigurations.id, id),
      eq(authConfigurations.organizationId, organizationId)
    ),
  });

  if (!existing) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  // Use the update schema (no required credentials validation)
  const result = authConfigUpdateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Build update data preserving existing secrets when not provided
  const updateFields = buildAuthDataForUpdate(result.data, existing);

  try {
    const [updated] = await db.update(authConfigurations)
      .set(updateFields)
      .where(eq(authConfigurations.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: 'Auth configuration not found' }, 404);
    }

    return c.json(toSafeAuthConfig(updated));
  } catch (error: any) {
    if (error.code === '23505') {
      return c.json({ error: 'An auth configuration with this name already exists' }, 409);
    }
    throw error;
  }
});

// Get usage count for an auth configuration
app.get('/:id/usage', requirePermission('system:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');

  // Verify config belongs to organization
  const existing = await db.query.authConfigurations.findFirst({
    where: and(
      eq(authConfigurations.id, id),
      eq(authConfigurations.organizationId, organizationId)
    ),
  });

  if (!existing) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  // Count usage across instances, systemServices, and instanceServices
  const [instanceCount] = await db.select({ count: count() })
    .from(instances)
    .where(eq(instances.authConfigId, id));

  const [systemServiceCount] = await db.select({ count: count() })
    .from(systemServices)
    .where(eq(systemServices.authConfigId, id));

  const [instanceServiceCount] = await db.select({ count: count() })
    .from(instanceServices)
    .where(eq(instanceServices.authConfigId, id));

  return c.json({
    instances: instanceCount?.count ?? 0,
    systemServices: systemServiceCount?.count ?? 0,
    instanceServices: instanceServiceCount?.count ?? 0,
    total: (instanceCount?.count ?? 0) + (systemServiceCount?.count ?? 0) + (instanceServiceCount?.count ?? 0),
  });
});

// Delete auth configuration
app.delete('/:id', requirePermission('system:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');

  // Verify config belongs to organization
  const existing = await db.query.authConfigurations.findFirst({
    where: and(
      eq(authConfigurations.id, id),
      eq(authConfigurations.organizationId, organizationId)
    ),
  });

  if (!existing) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  // Check for usage
  const [instanceCount] = await db.select({ count: count() })
    .from(instances)
    .where(eq(instances.authConfigId, id));

  const [systemServiceCount] = await db.select({ count: count() })
    .from(systemServices)
    .where(eq(systemServices.authConfigId, id));

  const [instanceServiceCount] = await db.select({ count: count() })
    .from(instanceServices)
    .where(eq(instanceServices.authConfigId, id));

  const totalUsage = (instanceCount?.count ?? 0) + (systemServiceCount?.count ?? 0) + (instanceServiceCount?.count ?? 0);

  if (totalUsage > 0) {
    return c.json({
      error: 'Cannot delete auth configuration',
      message: `Configuration is in use by ${totalUsage} resource(s). Remove all references first.`,
      usage: {
        instances: instanceCount?.count ?? 0,
        systemServices: systemServiceCount?.count ?? 0,
        instanceServices: instanceServiceCount?.count ?? 0,
      },
    }, 409);
  }

  const [deleted] = await db.delete(authConfigurations)
    .where(eq(authConfigurations.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  return c.json({ success: true });
});

export default app;
