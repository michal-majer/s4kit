import { Hono } from 'hono';
import { db, organizations, members, invitations, users, sessions } from '../../db';
import { z } from 'zod';
import { eq, and, ne } from 'drizzle-orm';
import { requirePermission, requireRole, type SessionVariables } from '../../middleware/session-auth';
import { sendInvitationEmail } from '../../services/email';

const app = new Hono<{ Variables: SessionVariables }>();

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  defaultLogLevel: z.enum(['minimal', 'standard', 'extended']).optional(),
  logRetentionDays: z.number().int().min(1).max(365).optional(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'developer']),
});

const invitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'developer']).default('developer'),
});

// Get current organization
app.get('/', requirePermission('organization:read'), async (c) => {
  const organizationId = c.get('organizationId')!;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  return c.json(org);
});

// Update organization
app.patch('/', requirePermission('organization:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();

  const result = updateOrganizationSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const updateData: Record<string, unknown> = {};
  if (result.data.name !== undefined) updateData.name = result.data.name;
  if (result.data.defaultLogLevel !== undefined) updateData.defaultLogLevel = result.data.defaultLogLevel;
  if (result.data.logRetentionDays !== undefined) updateData.logRetentionDays = result.data.logRetentionDays;

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const [updated] = await db
    .update(organizations)
    .set(updateData)
    .where(eq(organizations.id, organizationId))
    .returning();

  if (!updated) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  return c.json(updated);
});

// Delete organization (owner only)
app.delete('/', requireRole('owner'), async (c) => {
  const organizationId = c.get('organizationId')!;

  const [deleted] = await db
    .delete(organizations)
    .where(eq(organizations.id, organizationId))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  return c.json({ success: true });
});

// List organization members
app.get('/members', requirePermission('member:read'), async (c) => {
  const organizationId = c.get('organizationId')!;

  const orgMembers = await db
    .select({
      id: members.id,
      userId: members.userId,
      role: members.role,
      createdAt: members.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(members.organizationId, organizationId));

  return c.json(orgMembers);
});

// Update member role
app.patch('/members/:userId/role', requirePermission('member:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const targetUserId = c.req.param('userId');
  const currentUser = c.get('user')!;
  const currentUserRole = c.get('userRole');
  const body = await c.req.json();

  const result = updateMemberRoleSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { role: newRole } = result.data;

  // Cannot change your own role
  if (targetUserId === currentUser.id) {
    return c.json({ error: 'Cannot change your own role' }, 400);
  }

  // Only owner can assign/revoke owner role
  if (newRole === 'owner' && currentUserRole !== 'owner') {
    return c.json({ error: 'Only owners can assign owner role' }, 403);
  }

  // Check if target is current owner (cannot demote the only owner)
  const targetMember = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, organizationId),
      eq(members.userId, targetUserId)
    ),
  });

  if (!targetMember) {
    return c.json({ error: 'Member not found' }, 404);
  }

  // If demoting an owner, ensure there's another owner
  if (targetMember.role === 'owner' && newRole !== 'owner') {
    const otherOwners = await db.query.members.findMany({
      where: and(
        eq(members.organizationId, organizationId),
        eq(members.role, 'owner'),
        ne(members.userId, targetUserId)
      ),
    });

    if (otherOwners.length === 0) {
      return c.json({ error: 'Cannot demote the only owner' }, 400);
    }
  }

  const [updated] = await db
    .update(members)
    .set({ role: newRole })
    .where(and(
      eq(members.organizationId, organizationId),
      eq(members.userId, targetUserId)
    ))
    .returning();

  if (!updated) {
    return c.json({ error: 'Member not found' }, 404);
  }

  return c.json(updated);
});

// Remove member
app.delete('/members/:userId', requirePermission('member:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const targetUserId = c.req.param('userId');
  const currentUser = c.get('user')!;
  const currentUserRole = c.get('userRole');

  // Cannot remove yourself
  if (targetUserId === currentUser.id) {
    return c.json({ error: 'Cannot remove yourself from the organization' }, 400);
  }

  // Check target member's role
  const targetMember = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, organizationId),
      eq(members.userId, targetUserId)
    ),
  });

  if (!targetMember) {
    return c.json({ error: 'Member not found' }, 404);
  }

  // Only owner can remove other owners
  if (targetMember.role === 'owner' && currentUserRole !== 'owner') {
    return c.json({ error: 'Only owners can remove other owners' }, 403);
  }

  // Don't allow removing the last owner
  if (targetMember.role === 'owner') {
    const otherOwners = await db.query.members.findMany({
      where: and(
        eq(members.organizationId, organizationId),
        eq(members.role, 'owner'),
        ne(members.userId, targetUserId)
      ),
    });

    if (otherOwners.length === 0) {
      return c.json({ error: 'Cannot remove the only owner' }, 400);
    }
  }

  const [deleted] = await db
    .delete(members)
    .where(and(
      eq(members.organizationId, organizationId),
      eq(members.userId, targetUserId)
    ))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Member not found' }, 404);
  }

  // Revoke all sessions for the removed user to log them out
  await db
    .delete(sessions)
    .where(eq(sessions.userId, targetUserId));

  return c.json({ success: true });
});

// List pending invitations
app.get('/invitations', requirePermission('invitation:read'), async (c) => {
  const organizationId = c.get('organizationId')!;

  const pendingInvitations = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
      inviter: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(invitations)
    .leftJoin(users, eq(invitations.inviterId, users.id))
    .where(and(
      eq(invitations.organizationId, organizationId),
      eq(invitations.status, 'pending')
    ));

  return c.json(pendingInvitations);
});

// Send invitation
app.post('/invitations', requirePermission('invitation:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const currentUser = c.get('user')!;
  const body = await c.req.json();

  const result = invitationSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { email: rawEmail, role } = result.data;
  const email = rawEmail.toLowerCase(); // Normalize email

  // Check if user is already a member
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    const existingMember = await db.query.members.findFirst({
      where: and(
        eq(members.organizationId, organizationId),
        eq(members.userId, existingUser.id)
      ),
    });

    if (existingMember) {
      return c.json({ error: 'User is already a member of this organization' }, 400);
    }
  }

  // Check for existing pending invitation
  const existingInvitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.organizationId, organizationId),
      eq(invitations.email, email),
      eq(invitations.status, 'pending')
    ),
  });

  if (existingInvitation) {
    return c.json({ error: 'An invitation is already pending for this email' }, 400);
  }

  // Get organization name for the email
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  // Create invitation (expires in 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const [invitation] = await db
    .insert(invitations)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      email,
      role,
      status: 'pending',
      expiresAt,
      inviterId: currentUser.id,
    })
    .returning();

  if (!invitation) {
    return c.json({ error: 'Failed to create invitation' }, 500);
  }

  // Send invitation email
  await sendInvitationEmail({
    email,
    organizationName: org?.name || 'Unknown Organization',
    inviterName: currentUser.name || currentUser.email,
    role,
    invitationId: invitation.id,
  });

  return c.json(invitation, 201);
});

// Resend invitation
app.post('/invitations/:id/resend', requirePermission('invitation:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const invitationId = c.req.param('id');
  const currentUser = c.get('user')!;

  // Get the invitation
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(
      eq(invitations.id, invitationId),
      eq(invitations.organizationId, organizationId),
      eq(invitations.status, 'pending')
    ))
    .limit(1);

  if (!invitation) {
    return c.json({ error: 'Invitation not found or already accepted' }, 404);
  }

  // Get organization name
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  // Update expiration (extend by 7 days from now)
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  await db
    .update(invitations)
    .set({ expiresAt: newExpiresAt })
    .where(eq(invitations.id, invitationId));

  // Resend the email
  await sendInvitationEmail({
    email: invitation.email,
    organizationName: org?.name || 'Unknown Organization',
    inviterName: currentUser.name || currentUser.email,
    role: invitation.role as 'admin' | 'developer',
    invitationId: invitation.id,
  });

  return c.json({ success: true, expiresAt: newExpiresAt });
});

// Cancel invitation
app.delete('/invitations/:id', requirePermission('invitation:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const invitationId = c.req.param('id');

  const [deleted] = await db
    .delete(invitations)
    .where(and(
      eq(invitations.id, invitationId),
      eq(invitations.organizationId, organizationId)
    ))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Invitation not found' }, 404);
  }

  return c.json({ success: true });
});

export default app;
