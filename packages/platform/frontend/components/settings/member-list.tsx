'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Crown, Shield, User, Trash2, UserCog, Mail, RefreshCw, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { InviteMemberDialog } from './invite-member-dialog';
import { api, type OrganizationMember, type Invitation, type UserRole } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const roleConfig: Record<UserRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400',
  },
  developer: {
    label: 'Developer',
    icon: User,
    color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
  },
};

interface MemberListProps {
  initialMembers: OrganizationMember[];
  initialInvitations?: Invitation[];
}

export function MemberList({ initialMembers, initialInvitations = [] }: MemberListProps) {
  const [members, setMembers] = useState<OrganizationMember[]>(initialMembers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<Invitation | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);
  const router = useRouter();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRoleChange = async (member: OrganizationMember, newRole: UserRole) => {
    if (newRole === member.role) return;

    setIsUpdating(member.userId);
    try {
      await api.organization.updateMemberRole(member.userId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.userId === member.userId ? { ...m, role: newRole } : m))
      );
      toast.success('Role updated successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await api.organization.removeMember(memberToRemove.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== memberToRemove.userId));
      toast.success('Member removed successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setMemberToRemove(null);
    }
  };

  const handleInvite = async (email: string, role: UserRole) => {
    try {
      const invitation = await api.organization.sendInvitation(email, role);
      setInvitations((prev) => [...prev, invitation]);
      toast.success(`Invitation sent to ${email}`);
      setInviteDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
      throw error;
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    setIsResending(invitation.id);
    try {
      const result = await api.organization.resendInvitation(invitation.id);
      setInvitations((prev) =>
        prev.map((inv) => inv.id === invitation.id ? { ...inv, expiresAt: result.expiresAt } : inv)
      );
      toast.success(`Invitation resent to ${invitation.email}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation');
    } finally {
      setIsResending(null);
    }
  };

  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return;

    try {
      await api.organization.cancelInvitation(invitationToCancel.id);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationToCancel.id));
      toast.success('Invitation cancelled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel invitation');
    } finally {
      setInvitationToCancel(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with invite button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setInviteDialogOpen(true)} size="sm">
          Invite Member
        </Button>
      </div>

      {/* Member list */}
      <div className="divide-y divide-border rounded-xl border bg-card">
        {members.map((member) => {
          const roleInfo = roleConfig[member.role];
          const RoleIcon = roleInfo.icon;
          const isOwner = member.role === 'owner';
          const isLoading = isUpdating === member.userId;

          return (
            <div
              key={member.id}
              className={cn(
                "flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50",
                isLoading && "opacity-50 pointer-events-none"
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={member.user.image} alt={member.user.name} />
                  <AvatarFallback className="text-sm font-medium">
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{member.user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  variant="secondary"
                  className={cn('gap-1 font-medium', roleInfo.color)}
                >
                  <RoleIcon className="h-3 w-3" />
                  {roleInfo.label}
                </Badge>

                {!isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRoleChange(member, 'admin')}
                        disabled={member.role === 'admin'}
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRoleChange(member, 'developer')}
                        disabled={member.role === 'developer'}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Make Developer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setMemberToRemove(member)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Pending Invitations ({invitations.length})
          </p>
          <div className="divide-y divide-border rounded-xl border border-dashed bg-muted/30">
            {invitations.map((invitation) => {
              const roleInfo = roleConfig[invitation.role];
              const RoleIcon = roleInfo.icon;
              const isExpired = new Date(invitation.expiresAt) < new Date();
              const isLoading = isResending === invitation.id;

              return (
                <div
                  key={invitation.id}
                  className={cn(
                    "flex items-center justify-between gap-4 p-4 transition-colors",
                    isLoading && "opacity-50 pointer-events-none"
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{invitation.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {isExpired ? (
                          <span className="text-destructive">Expired</span>
                        ) : (
                          <span>Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant="secondary"
                      className={cn('gap-1 font-medium', roleInfo.color)}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {roleInfo.label}
                    </Badge>

                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
                      Pending
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleResendInvitation(invitation)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resend Invitation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setInvitationToCancel(invitation)}
                          className="text-destructive focus:text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel Invitation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInvite}
      />

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium text-foreground">
                {memberToRemove?.user.name}
              </span>{' '}
              from this organization? They will lose access to all resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Confirmation */}
      <AlertDialog
        open={!!invitationToCancel}
        onOpenChange={(open) => !open && setInvitationToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{' '}
              <span className="font-medium text-foreground">
                {invitationToCancel?.email}
              </span>
              ? They will no longer be able to join this organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
