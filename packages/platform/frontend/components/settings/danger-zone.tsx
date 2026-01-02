'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Separator } from '@/components/ui/separator';

interface DangerZoneProps {
  organizationName: string;
}

export function DangerZone({ organizationName }: DangerZoneProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { userRole } = useAuth();

  // Only owners can see the danger zone
  if (userRole !== 'owner') {
    return null;
  }

  const isConfirmValid = confirmText === organizationName;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    try {
      await api.organization.delete();
      toast.success('Organization deleted');
      // Redirect to home (user will be logged out or redirected)
      router.push('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
      setIsDeleting(false);
      setIsOpen(false);
      setConfirmText('');
    }
  };

  return (
    <>
      <Separator />
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-destructive/10 p-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Permanently delete this organization and all of its data. This action cannot be undone.
            </p>
          </div>

          <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Organization
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete Organization
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This will permanently delete{' '}
                    <span className="font-semibold text-foreground">
                      {organizationName}
                    </span>{' '}
                    and all associated data including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>All SAP systems and instances</li>
                    <li>All API keys and access grants</li>
                    <li>All request logs and analytics</li>
                    <li>All team members will lose access</li>
                  </ul>
                  <p className="font-medium text-foreground pt-2">
                    Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{organizationName}</span> to confirm:
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type organization name"
                className="mt-2"
              />

              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel onClick={() => setConfirmText('')}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!isConfirmValid || isDeleting}
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete Organization
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
    </>
  );
}
