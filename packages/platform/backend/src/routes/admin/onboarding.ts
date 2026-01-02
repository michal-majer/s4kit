import { Hono } from 'hono';
import { db, organizations } from '../../db';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth, type SessionVariables } from '../../middleware/session-auth';
import type { OnboardingData } from '@s4kit/shared/db/schema';

const app = new Hono<{ Variables: SessionVariables }>();

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
});

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
  const body = await c.req.json();

  const result = onboardingDataSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const onboardingData: OnboardingData = result.data;

  // Update organization with onboarding data
  const [updated] = await db
    .update(organizations)
    .set({
      name: onboardingData.organizationName,
      onboardingData,
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  if (!updated) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  return c.json({
    success: true,
    organization: {
      id: updated.id,
      name: updated.name,
      onboardingCompletedAt: updated.onboardingCompletedAt,
    },
  });
});

// Skip onboarding (mark as complete without data)
app.post('/skip', requireAuth, async (c) => {
  const organizationId = c.get('organizationId')!;

  const [updated] = await db
    .update(organizations)
    .set({
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  if (!updated) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  return c.json({
    success: true,
    organization: {
      id: updated.id,
      name: updated.name,
      onboardingCompletedAt: updated.onboardingCompletedAt,
    },
  });
});

export default app;
