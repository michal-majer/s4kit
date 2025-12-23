import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins/organization';
import { db, organizations } from '../db';
import * as authSchema from '../db/auth-schema';
import { config } from '../config/mode';
import { eq } from 'drizzle-orm';

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
      // TODO: Integrate with email service (Resend, SendGrid, etc.)
      console.log(`[Auth] Password reset for ${user.email}: ${url}`);
    },
  },

  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      // TODO: Integrate with email service
      console.log(`[Auth] Verification for ${user.email}: ${url}`);
    },
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
          // Auto-create organization for new users and add them as owner
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
