import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationForm } from '@/components/settings/organization-form';
import { MemberList } from '@/components/settings/member-list';
import { DangerZone } from '@/components/settings/danger-zone';
import { withServerCookies } from '@/lib/server-api';
import { api } from '@/lib/api';

export default async function OrganizationSettingsPage() {
  // Check user role first before fetching owner-only data
  const currentUser = await withServerCookies(() => api.me.get());

  // Only owners can access organization settings
  if (currentUser.role !== 'owner') {
    redirect('/settings/profile');
  }

  // Fetch organization data (owner-only endpoints)
  const [organization, members, invitations] = await withServerCookies(() =>
    Promise.all([
      api.organization.get(),
      api.organization.getMembers(),
      api.organization.getInvitations(),
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
          <MemberList initialMembers={members} initialInvitations={invitations} />
        </CardContent>
      </Card>

      {/* Danger Zone - includes its own separator, only shows for owners */}
      <DangerZone organizationName={organization.name} />
    </div>
  );
}
