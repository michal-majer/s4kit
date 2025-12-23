import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionsList } from '@/components/settings/sessions-list';
import { withServerCookies } from '@/lib/server-api';
import { api } from '@/lib/api';

// @TODO: Two-Factor Authentication - requires twoFactor plugin configured in better-auth
// import { TwoFactorSettings } from '@/components/settings/two-factor-settings';

// @TODO: Audit Log - requires audit logging endpoint
// import { AuditLog } from '@/components/settings/audit-log';

export default async function SecuritySettingsPage() {
  const sessions = await withServerCookies(() => api.sessions.list());

  return (
    <div className="space-y-8">
      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage your active sessions across devices. You can sign out of any session
            except your current one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsList initialSessions={sessions} />
        </CardContent>
      </Card>

      {/* @TODO: Two-Factor Authentication - requires twoFactor plugin configured in better-auth
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account by requiring a verification
            code when signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorSettings enabled={false} />
        </CardContent>
      </Card>
      */}

      {/* @TODO: Audit Log - requires audit logging endpoint
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>
            A record of security-related activity in your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLog />
        </CardContent>
      </Card>
      */}
    </div>
  );
}
