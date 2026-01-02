import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins/organization';
import { db, organizations } from '../db';
import * as authSchema from '../db/auth-schema';
import { config } from '../config/mode';
import { eq, and } from 'drizzle-orm';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authSchema.users,
      session: authSchema.sessions,
      account: authSchema.accounts,
      verification: authSchema.verifications,
    },
  }),

  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [frontendUrl],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: config.features.emailVerification,
    async sendResetPassword({ user, url }) {
      // Ensure the callbackURL points to the frontend
      const resetUrl = new URL(url);
      resetUrl.searchParams.set('callbackURL', `${frontendUrl}/reset-password`);
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        url: resetUrl.toString(),
      });
    },
  },

  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      // Check if user has pending invitation - skip verification email if so
      // They will be auto-verified in databaseHooks.user.create.after
      const pendingInvitation = await db.query.invitations.findFirst({
        where: and(
          eq(authSchema.invitations.email, user.email.toLowerCase()),
          eq(authSchema.invitations.status, 'pending')
        ),
      });

      if (pendingInvitation) {
        console.log(`[Auth] Skipping verification email for invited user ${user.email}`);
        return;
      }

      // Regular signup - send verification email
      const verificationUrl = new URL(url);
      verificationUrl.searchParams.set('callbackURL', frontendUrl);
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        url: verificationUrl.toString(),
      });
    },
    autoSignInAfterVerification: true,
  },

  socialProviders: config.features.socialLogin
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        },
        github: {
          clientId: process.env.GITHUB_CLIENT_ID || '',
          clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        },
      }
    : {},

  plugins: [
    organization({
      allowUserToCreateOrganization: config.features.multiOrg,
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github'],
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Check if user has a pending invitation
          const pendingInvitation = await db.query.invitations.findFirst({
            where: and(
              eq(authSchema.invitations.email, user.email.toLowerCase()),
              eq(authSchema.invitations.status, 'pending')
            ),
          });

          if (pendingInvitation) {
            // User was invited - auto-verify, join org, and accept invitation
            console.log(`[Auth] Processing invited user ${user.email}`);

            // Auto-verify email
            await db
              .update(authSchema.users)
              .set({ emailVerified: true })
              .where(eq(authSchema.users.id, user.id));

            // Add user to organization with invited role
            await db.insert(authSchema.members).values({
              id: crypto.randomUUID(),
              organizationId: pendingInvitation.organizationId,
              userId: user.id,
              role: pendingInvitation.role,
            });

            // Mark invitation as accepted
            await db
              .update(authSchema.invitations)
              .set({ status: 'accepted' })
              .where(eq(authSchema.invitations.id, pendingInvitation.id));

            console.log(`[Auth] Invited user ${user.email} joined org ${pendingInvitation.organizationId}`);
            return;
          }

          // Regular signup - create organization for new user
          console.log(`[Auth] Creating organization for new user: ${user.email}`);

          const orgId = crypto.randomUUID();
          const orgName = user.name ? `${user.name}'s Organization` : 'My Organization';

          // Create organization
          await db.insert(organizations).values({
            id: orgId,
            name: orgName,
          });

          // Add user as owner
          await db.insert(authSchema.members).values({
            id: crypto.randomUUID(),
            organizationId: orgId,
            userId: user.id,
            role: 'owner',
          });

          console.log(`[Auth] Created organization ${orgId} for user ${user.id}`);
        },
      },
    },
  },
});

// Export types for use in middleware
export type Session = typeof auth.$Infer.Session;
export type User = Session['user'];
