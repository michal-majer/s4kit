import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/settings/profile-form';
import { ChangePasswordForm } from '@/components/settings/change-password-form';
import { withServerCookies } from '@/lib/server-api';
import { api } from '@/lib/api';

// @TODO: Avatar upload - requires file storage backend (S3, Cloudflare R2, etc.)
// import { AvatarUpload } from '@/components/settings/avatar-upload';

// @TODO: Connected accounts - requires OAuth providers (Google, GitHub) configured
// import { ConnectedAccounts } from '@/components/settings/connected-accounts';

export default async function ProfileSettingsPage() {
  const profile = await withServerCookies(() => api.profile.get());

  return (
    <div className="space-y-8">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your personal information and how others see you on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* @TODO: Avatar upload - requires file storage backend
          <AvatarUpload currentImage={profile.image} name={profile.name} />
          <Separator className="my-8" />
          */}
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Change your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {/* @TODO: Connected Accounts - requires OAuth providers configured
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected social accounts for sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectedAccounts />
        </CardContent>
      </Card>
      */}
    </div>
  );
}
