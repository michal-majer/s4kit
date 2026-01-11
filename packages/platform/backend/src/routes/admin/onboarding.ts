import { Hono } from 'hono';
import {
  db,
  organizations,
  systems,
  instances,
  systemServices,
  instanceServices,
  predefinedServices,
  authConfigurations,
} from '../../db';
import { encryption } from '@s4kit/shared/services';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth, type SessionVariables } from '../../middleware/session-auth';
import type { OnboardingData } from '@s4kit/shared/db/schema';

const app = new Hono<{ Variables: SessionVariables }>();

// Constants for SAP Business Accelerator Hub (API Hub Sandbox)
const SAP_API_HUB = {
  SYSTEM_NAME: 'SAP Business Accelerator Hub',
  SYSTEM_TYPE: 's4_public' as const,
  DESCRIPTION: 'SAP sandbox environment for S/4HANA Cloud APIs',
  BASE_URL: 'https://sandbox.api.sap.com/s4hanacloud',
  ENVIRONMENT: 'sandbox' as const,
  AUTH_CONFIG_NAME: 'SAP API Hub API Key',
  AUTH_HEADER_NAME: 'APIKey',
  POPULAR_SERVICES: [
    'bp',
    'salesorder',
    'product',
    'purchorder',
    'glaccount',
    'costcenter',
    'companycode',
    'materialdoc',
    'billing',
    'glaccountlineitem',
  ],
};

// Onboarding data schema - validates incoming data
const onboardingDataSchema = z.object({
  organizationName: z.string().min(1).max(255),
  // Future extensible fields
  companySize: z.enum(['solo', '2-10', '11-50', '51-200', '200+']).optional(),
  industry: z.string().max(100).optional(),
  role: z.enum(['developer', 'architect', 'manager', 'consultant', 'other']).optional(),
  useCase: z.enum(['integration', 'development', 'testing', 'migration', 'other']).optional(),
  sapSystemTypes: z.array(z.enum(['s4_public', 's4_private', 'btp'])).optional(),
  referralSource: z.enum(['search', 'social', 'recommendation', 'event', 'other']).optional(),
  // SAP API Hub fields
  apiHubApiKey: z.string().optional(),
  skipApiHubAuth: z.boolean().optional(),
});

// Helper function to create SAP Business Accelerator Hub system and instance
// Returns array of created instance service IDs for verification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createApiHubSystem(tx: any, organizationId: string, userId: string, apiKey?: string): Promise<string[]> {
  // Check if API Hub system already exists (prevent duplicates)
  const existingSystem = await tx.query.systems.findFirst({
    where: and(eq(systems.organizationId, organizationId), eq(systems.name, SAP_API_HUB.SYSTEM_NAME)),
  });

  if (existingSystem) {
    return []; // Already exists, skip creation
  }

  // 1. Create SAP Business Accelerator Hub system
  const systemResult = await tx
    .insert(systems)
    .values({
      organizationId,
      name: SAP_API_HUB.SYSTEM_NAME,
      type: SAP_API_HUB.SYSTEM_TYPE,
      description: SAP_API_HUB.DESCRIPTION,
      createdBy: userId,
    })
    .returning();

  const system = systemResult[0];
  if (!system) {
    throw new Error('Failed to create system');
  }

  // 2. Auto-populate predefined services for s4_public
  const predefined = await tx.query.predefinedServices.findMany({
    where: eq(predefinedServices.systemType, SAP_API_HUB.SYSTEM_TYPE),
  });

  if (predefined.length > 0) {
    await tx.insert(systemServices).values(
      predefined.map((ps: typeof predefined[0]) => ({
        systemId: system.id,
        predefinedServiceId: ps.id,
        name: ps.name,
        alias: ps.alias,
        servicePath: ps.servicePath,
        description: ps.description,
        entities: ps.defaultEntities || [],
        odataVersion: ps.odataVersion,
      })),
    );
  }

  // 3. Create auth configuration if API key provided
  let authConfigId: string | null = null;
  if (apiKey) {
    const authConfigResult = await tx
      .insert(authConfigurations)
      .values({
        organizationId,
        name: SAP_API_HUB.AUTH_CONFIG_NAME,
        description: 'API key for SAP Business Accelerator Hub sandbox',
        authType: 'custom',
        authConfig: { headerName: SAP_API_HUB.AUTH_HEADER_NAME },
        credentials: { headerValue: encryption.encrypt(apiKey) },
      })
      .returning();
    const authConfig = authConfigResult[0];
    if (!authConfig) {
      throw new Error('Failed to create auth configuration');
    }
    authConfigId = authConfig.id;
  }

  // 4. Create sandbox instance
  const instanceResult = await tx
    .insert(instances)
    .values({
      systemId: system.id,
      environment: SAP_API_HUB.ENVIRONMENT,
      baseUrl: SAP_API_HUB.BASE_URL,
      authConfigId,
    })
    .returning();

  const instance = instanceResult[0];
  if (!instance) {
    throw new Error('Failed to create instance');
  }

  // 5. Auto-link popular services to the instance
  const systemServicesForPopular = await tx.query.systemServices.findMany({
    where: and(eq(systemServices.systemId, system.id), inArray(systemServices.alias, SAP_API_HUB.POPULAR_SERVICES)),
  });

  const createdInstanceServiceIds: string[] = [];

  if (systemServicesForPopular.length > 0) {
    const createdInstanceServices = await tx
      .insert(instanceServices)
      .values(
        systemServicesForPopular.map((svc: typeof systemServicesForPopular[0]) => ({
          instanceId: instance.id,
          systemServiceId: svc.id,
          verificationStatus: 'pending' as const,
        })),
      )
      .returning();

    createdInstanceServiceIds.push(...createdInstanceServices.map((is: { id: string }) => is.id));
  }

  return createdInstanceServiceIds;
}

// Helper function to verify instance services (async, non-blocking)
async function verifyInstanceServices(instanceServiceIds: string[]): Promise<void> {
  // Import verification logic dynamically to avoid circular dependencies
  const { metadataParser } = await import('@s4kit/shared/services');

  for (const instanceServiceId of instanceServiceIds) {
    try {
      const instanceService = await db.query.instanceServices.findFirst({
        where: eq(instanceServices.id, instanceServiceId),
      });

      if (!instanceService) continue;

      const [instance, systemService] = await Promise.all([
        db.query.instances.findFirst({
          where: eq(instances.id, instanceService.instanceId),
        }),
        db.query.systemServices.findFirst({
          where: eq(systemServices.id, instanceService.systemServiceId),
        }),
      ]);

      if (!instance || !systemService) continue;

      // Get auth config for the instance
      let auth = null;
      if (instance.authConfigId) {
        const authConfig = await db.query.authConfigurations.findFirst({
          where: eq(authConfigurations.id, instance.authConfigId),
        });
        if (authConfig && authConfig.authType !== 'none') {
          auth = {
            type: authConfig.authType,
            username: authConfig.username,
            password: authConfig.password,
            config: authConfig.authConfig,
            credentials: authConfig.credentials,
          };
        }
      }

      const servicePath = instanceService.servicePathOverride || systemService.servicePath;

      const metadataResult = await metadataParser.fetchMetadata({
        baseUrl: instance.baseUrl,
        servicePath,
        auth,
      });

      if (metadataResult.error) {
        await db
          .update(instanceServices)
          .set({
            verificationStatus: 'failed',
            lastVerifiedAt: new Date(),
            verificationError: metadataResult.error,
          })
          .where(eq(instanceServices.id, instanceServiceId));
        continue;
      }

      const entityNames = metadataResult.entities.map((e: { name: string }) => e.name);

      await db
        .update(instanceServices)
        .set({
          entities: entityNames,
          verificationStatus: 'verified',
          lastVerifiedAt: new Date(),
          verificationError: null,
        })
        .where(eq(instanceServices.id, instanceServiceId));

      // Update systemService odataVersion if detected
      if (metadataResult.odataVersion && !systemService.odataVersion) {
        await db
          .update(systemServices)
          .set({ odataVersion: metadataResult.odataVersion, updatedAt: new Date() })
          .where(eq(systemServices.id, systemService.id));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      await db
        .update(instanceServices)
        .set({
          verificationStatus: 'failed',
          lastVerifiedAt: new Date(),
          verificationError: errorMessage,
        })
        .where(eq(instanceServices.id, instanceServiceId));
    }
  }
}

// Get onboarding status and data
app.get('/', requireAuth, async (c) => {
  const organizationId = c.get('organizationId')!;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  return c.json({
    completed: org.onboardingCompletedAt !== null,
    completedAt: org.onboardingCompletedAt,
    data: org.onboardingData,
    // Current organization name (may be auto-generated)
    currentOrganizationName: org.name,
  });
});

// Complete onboarding
app.post('/complete', requireAuth, async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('user')!.id;
  const body = await c.req.json();

  const result = onboardingDataSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const formData = result.data;

  try {
    const { updatedOrg, instanceServiceIds } = await db.transaction(async (tx) => {
      // Store onboarding data without the API key (don't persist sensitive data in onboarding JSON)
      const storedOnboardingData: OnboardingData = {
        organizationName: formData.organizationName,
        companySize: formData.companySize,
        industry: formData.industry,
        role: formData.role,
        useCase: formData.useCase,
        sapSystemTypes: formData.sapSystemTypes,
        referralSource: formData.referralSource,
      };

      // 1. Update organization with onboarding data
      const [updated] = await tx
        .update(organizations)
        .set({
          name: formData.organizationName,
          onboardingData: storedOnboardingData,
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId))
        .returning();

      if (!updated) {
        throw new Error('Organization not found');
      }

      // 2. Create SAP Business Accelerator Hub system
      // Only include API key if provided and not skipped
      const apiKey = !formData.skipApiHubAuth && formData.apiHubApiKey ? formData.apiHubApiKey : undefined;
      const createdServiceIds = await createApiHubSystem(tx, organizationId, userId, apiKey);

      return { updatedOrg: updated, instanceServiceIds: createdServiceIds };
    });

    // 3. Trigger async verification for created instance services (non-blocking)
    if (instanceServiceIds.length > 0) {
      verifyInstanceServices(instanceServiceIds).catch((err) => {
        console.error('Async verification failed for onboarding services:', err);
      });
    }

    return c.json({
      success: true,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        onboardingCompletedAt: updatedOrg.onboardingCompletedAt,
      },
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    const message = error instanceof Error ? error.message : 'Failed to complete onboarding';
    return c.json({ error: message }, 500);
  }
});

// Skip onboarding (mark as complete without data, but still create system)
app.post('/skip', requireAuth, async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('user')!.id;

  try {
    const { updatedOrg, instanceServiceIds } = await db.transaction(async (tx) => {
      // 1. Mark onboarding complete
      const [updated] = await tx
        .update(organizations)
        .set({
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId))
        .returning();

      if (!updated) {
        throw new Error('Organization not found');
      }

      // 2. Create SAP Business Accelerator Hub system (without auth)
      const createdServiceIds = await createApiHubSystem(tx, organizationId, userId);

      return { updatedOrg: updated, instanceServiceIds: createdServiceIds };
    });

    // 3. Trigger async verification for created instance services (non-blocking)
    // Note: Without auth configured, verification will likely fail, but that's expected
    if (instanceServiceIds.length > 0) {
      verifyInstanceServices(instanceServiceIds).catch((err) => {
        console.error('Async verification failed for onboarding services:', err);
      });
    }

    return c.json({
      success: true,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        onboardingCompletedAt: updatedOrg.onboardingCompletedAt,
      },
    });
  } catch (error) {
    console.error('Onboarding skip error:', error);
    const message = error instanceof Error ? error.message : 'Failed to skip onboarding';
    return c.json({ error: message }, 500);
  }
});

export default app;
