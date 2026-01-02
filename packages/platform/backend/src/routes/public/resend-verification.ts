import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import * as authSchema from '../../db/auth-schema';
import { sendVerificationEmail } from '../../services/email';

const app = new Hono();

const resendSchema = z.object({
  email: z.string().email(),
});

// POST /api/resend-verification
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = resendSchema.parse(body);

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(authSchema.users.email, email.toLowerCase()),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`[Resend] No user found for ${email}`);
      return c.json({ success: true, message: 'If an account exists, a verification email has been sent.' });
    }

    // Check if already verified
    if (user.emailVerified) {
      console.log(`[Resend] User ${email} is already verified`);
      return c.json({ success: true, message: 'If an account exists, a verification email has been sent.' });
    }

    // Generate verification token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await db.insert(authSchema.verifications).values({
      id: crypto.randomUUID(),
      identifier: email.toLowerCase(),
      value: token,
      expiresAt,
    });

    // Build verification URL
    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent(frontendUrl)}`;

    // Send verification email
    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      url: verificationUrl,
    });

    console.log(`[Resend] Verification email sent to ${email}`);
    return c.json({ success: true, message: 'Verification email sent.' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: 'Invalid email address' }, 400);
    }
    console.error('[Resend] Error:', error);
    return c.json({ success: false, error: 'Failed to send verification email' }, 500);
  }
});

export default app;
