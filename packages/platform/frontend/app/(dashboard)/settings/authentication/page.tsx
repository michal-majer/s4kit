import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthConfigList } from '@/components/settings/auth-config-list';
import { withServerCookies } from '@/lib/server-api';
import { api } from '@/lib/api';

export default async function AuthenticationSettingsPage() {
  const authConfigs = await withServerCookies(() => api.authConfigurations.list());

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Configurations</CardTitle>
          <CardDescription>
            Manage reusable authentication configurations for your SAP connections.
            These configurations can be shared across instances and services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthConfigList initialConfigs={authConfigs} />
        </CardContent>
      </Card>
    </div>
  );
}
