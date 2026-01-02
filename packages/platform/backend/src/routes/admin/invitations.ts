import { Hono } from 'hono';
import { db, organizations } from '../../db';
import { members, invitations, users } from '../../db/auth-schema';
import { eq, and } from 'drizzle-orm';
import { sessionMiddleware, type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

// Get invitation details (public - no auth required, used before login)
app.get('/:id', async (c) => {
  const invitationId = c.req.param('id');

  const invitation = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      organizationId: invitations.organizationId,
      organizationName: organizations.name,
      inviterName: users.name,
    })
    .from(invitations)
    .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
    .leftJoin(users, eq(invitations.inviterId, users.id))
    .where(eq(invitations.id, invitationId))
    .limit(1);

  if (!invitation[0]) {
    return c.json({ error: 'Invitation not found' }, 404);
  }

  const inv = invitation[0];

  // Check if expired
  if (new Date(inv.expiresAt) < new Date()) {
    return c.json({
      ...inv,
      status: 'expired',
      error: 'This invitation has expired',
    });
  }

  // Check if already accepted
  if (inv.status !== 'pending') {
    return c.json({
      ...inv,
      error: inv.status === 'accepted' ? 'This invitation has already been accepted' : 'This invitation is no longer valid',
    });
  }

  // Check if user with this email already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, inv.email.toLowerCase()),
  });

  return c.json({
    ...inv,
    userExists: !!existingUser,
  });
});

// Accept invitation (requires auth)
app.post('/:id/accept', sessionMiddleware, async (c) => {
  const invitationId = c.req.param('id');
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Please log in to accept this invitation' }, 401);
  }

  // Get the invitation
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1);

  if (!invitation) {
    return c.json({ error: 'Invitation not found' }, 404);
  }

  // Check if invitation is for this user's email
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return c.json({
      error: 'This invitation was sent to a different email address',
      invitedEmail: invitation.email,
    }, 403);
  }

  // Check if expired
  if (new Date(invitation.expiresAt) < new Date()) {
    return c.json({ error: 'This invitation has expired' }, 410);
  }

  // Check if already accepted
  if (invitation.status !== 'pending') {
    return c.json({ error: 'This invitation has already been used' }, 410);
  }

  // Check if user is already a member
  const existingMember = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, invitation.organizationId),
      eq(members.userId, user.id)
    ),
  });

  if (existingMember) {
    // Mark invitation as accepted anyway
    await db
      .update(invitations)
      .set({ status: 'accepted' })
      .where(eq(invitations.id, invitationId));

    return c.json({
      success: true,
      message: 'You are already a member of this organization',
      organizationId: invitation.organizationId,
    });
  }

  // Add user to organization
  await db.insert(members).values({
    id: crypto.randomUUID(),
    organizationId: invitation.organizationId,
    userId: user.id,
    role: invitation.role,
  });

  // Mark invitation as accepted
  await db
    .update(invitations)
    .set({ status: 'accepted' })
    .where(eq(invitations.id, invitationId));

  // Get organization name for response
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, invitation.organizationId),
  });

  return c.json({
    success: true,
    message: `You have joined ${org?.name || 'the organization'}`,
    organizationId: invitation.organizationId,
    organizationName: org?.name,
    role: invitation.role,
  });
});

export default app;
