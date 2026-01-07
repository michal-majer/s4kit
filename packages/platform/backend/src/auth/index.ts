import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins/organization';
import { genericOAuth, type GenericOAuthConfig } from 'better-auth/plugins';
import { db, organizations } from '../db';
import * as authSchema from '../db/auth-schema';
import { config } from '../config/mode';
import { eq, and } from 'drizzle-orm';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { getXsuaaOAuthConfig, mapXsuaaScopesToRole } from './xsuaa-provider';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

// Auto-detect backend URL from CF, Railway, or explicit config
const getBackendUrl = () => {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;

  // Cloud Foundry
  if (process.env.VCAP_APPLICATION) {
    try {
      const vcap = JSON.parse(process.env.VCAP_APPLICATION);
      if (vcap.application_uris?.[0]) {
        return `https://${vcap.application_uris[0]}`;
      }
    } catch { /* ignore parse errors */ }
  }

  // Railway
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  if (process.env.RAILWAY_STATIC_URL) return process.env.RAILWAY_STATIC_URL;

  return 'http://localhost:3000';
};

// Auto-detect cookie domain for cross-subdomain cookies
const getCookieDomain = (): string | undefined => {
  if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN;

  // Cloud Foundry: extract parent domain from app URI
  // e.g., "s4kit-backend.cfapps.us10-001.hana.ondemand.com" -> ".cfapps.us10-001.hana.ondemand.com"
  if (process.env.VCAP_APPLICATION) {
    try {
      const vcap = JSON.parse(process.env.VCAP_APPLICATION);
      const uri = vcap.application_uris?.[0];
      if (uri) {
        const parts = uri.split('.');
        if (parts.length > 2) {
          // Remove app name, keep parent domain with leading dot
          return '.' + parts.slice(1).join('.');
        }
      }
    } catch { /* ignore parse errors */ }
  }

  return undefined;
};

// Build XSUAA genericOAuth configuration if available
const buildXsuaaOAuthConfig = (): GenericOAuthConfig | null => {
  const xsuaaConfig = getXsuaaOAuthConfig();
  if (!xsuaaConfig) return null;

  return {
    providerId: 'xsuaa',
    clientId: xsuaaConfig.clientId,
    clientSecret: xsuaaConfig.clientSecret,
    authorizationUrl: xsuaaConfig.authorizationUrl,
    tokenUrl: xsuaaConfig.tokenUrl,
    userInfoUrl: xsuaaConfig.userinfoUrl,
    scopes: ['openid'],
    pkce: false,
    // Map XSUAA user info to better-auth user format
    mapProfileToUser: (profile: Record<string, unknown>) => {
      return {
        email: (profile.email as string) || (profile.user_name as string),
        name: (profile.given_name as string)
          ? `${profile.given_name} ${profile.family_name || ''}`.trim()
          : (profile.user_name as string),
        emailVerified: true, // XSUAA users are pre-verified
      };
    },
  };
};

const xsuaaOAuthConfig = buildXsuaaOAuthConfig();

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

  baseURL: getBackendUrl(),
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [frontendUrl],

  advanced: {
    defaultCookieAttributes: {
      // With cookie domain (CF or explicit): use secure 'lax' + cross-subdomain cookies
      // Without cookie domain (local dev): use 'none' for cross-site cookies
      sameSite: getCookieDomain() ? 'lax' : 'none',
      secure: true,
      ...(getCookieDomain() && { domain: getCookieDomain() }),
    },
  },

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
    // Add XSUAA OAuth provider if available (SAP BTP)
    ...(xsuaaOAuthConfig
      ? [genericOAuth({ config: [xsuaaOAuthConfig] })]
      : []),
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
      trustedProviders: ['google', 'github', 'xsuaa'],
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
