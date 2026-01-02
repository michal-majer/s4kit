import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const isDev = process.env.NODE_ENV !== 'production';
const fromEmail = process.env.EMAIL_FROM || 'S4Kit <noreply@s4kit.com>';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    console.log(`[Email] (dev mode) To: ${params.to}`);
    console.log(`[Email] Subject: ${params.subject}`);
    console.log(`[Email] HTML: ${params.html.substring(0, 200)}...`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error(`[Email] Failed to send email to ${params.to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`[Email] Sent to ${params.to}: ${params.subject}`);
  } catch (err) {
    console.error(`[Email] Error sending email:`, err);
    if (!isDev) {
      throw err;
    }
  }
}

export async function sendVerificationEmail(params: {
  email: string;
  name?: string | null;
  url: string;
}): Promise<void> {
  const { email, name, url } = params;
  const displayName = name || 'there';

  await sendEmail({
    to: email,
    subject: 'Verify your S4Kit account',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #0066cc; margin: 0;">S4Kit</h1>
  </div>

  <h2 style="color: #333;">Welcome to S4Kit!</h2>

  <p>Hi ${displayName},</p>

  <p>Thanks for signing up. Please verify your email address to get started.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${url}" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Verify Email</a>
  </div>

  <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
  <p style="color: #0066cc; font-size: 14px; word-break: break-all;">${url}</p>

  <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">If you didn't create an account with S4Kit, you can safely ignore this email.</p>
</body>
</html>
    `.trim(),
  });
}

export async function sendPasswordResetEmail(params: {
  email: string;
  name?: string | null;
  url: string;
}): Promise<void> {
  const { email, name, url } = params;
  const displayName = name || 'there';

  await sendEmail({
    to: email,
    subject: 'Reset your S4Kit password',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #0066cc; margin: 0;">S4Kit</h1>
  </div>

  <h2 style="color: #333;">Reset your password</h2>

  <p>Hi ${displayName},</p>

  <p>We received a request to reset your password. Click the button below to choose a new password.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${url}" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Reset Password</a>
  </div>

  <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
  <p style="color: #0066cc; font-size: 14px; word-break: break-all;">${url}</p>

  <p style="color: #666; font-size: 14px;"><strong>This link will expire in 1 hour.</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
</body>
</html>
    `.trim(),
  });
}

export async function sendInvitationEmail(params: {
  email: string;
  organizationName: string;
  inviterName: string;
  role: string;
  invitationId: string;
}): Promise<void> {
  const { email, organizationName, inviterName, role, invitationId } = params;
  const acceptUrl = `${frontendUrl}/accept-invitation?id=${invitationId}`;

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName} on S4Kit`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #0066cc; margin: 0;">S4Kit</h1>
  </div>

  <h2 style="color: #333;">You're invited!</h2>

  <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on S4Kit as a <strong>${role}</strong>.</p>

  <p>S4Kit provides a developer-friendly SDK for SAP S/4HANA integration with API key authentication, TypeScript types, and multi-environment support.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${acceptUrl}" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Accept Invitation</a>
  </div>

  <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
  <p style="color: #0066cc; font-size: 14px; word-break: break-all;">${acceptUrl}</p>

  <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
</body>
</html>
    `.trim(),
  });
}
