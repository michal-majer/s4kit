import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrganizationForm } from '@/components/settings/organization-form';
import { MemberList } from '@/components/settings/member-list';
import { DangerZone } from '@/components/settings/danger-zone';
import { withServerCookies } from '@/lib/server-api';
import { api } from '@/lib/api';

export default async function OrganizationSettingsPage() {
  const [organization, members] = await withServerCookies(() =>
    Promise.all([
      api.organization.get(),
      api.organization.getMembers(),
    ])
  );

  return (
    <div className="space-y-8">
      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Update your organization name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm organization={organization} />
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage who has access to this organization and their permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberList initialMembers={members} />
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <DangerZone organizationName={organization.name} />
    </div>
  );
}
