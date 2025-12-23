'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type UserRole } from '@/lib/api';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'developer']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string, role: UserRole) => Promise<void>;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  onInvite,
}: InviteMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'developer',
    },
  });

  const onSubmit = async (data: InviteFormValues) => {
    setIsLoading(true);
    try {
      await onInvite(data.email, data.role);
      form.reset();
    } catch {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to your organization.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="colleague@company.com"
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex flex-col">
                          <span className="font-medium">Admin</span>
                          <span className="text-xs text-muted-foreground">
                            Can manage systems, API keys, and members
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="developer">
                        <div className="flex flex-col">
                          <span className="font-medium">Developer</span>
                          <span className="text-xs text-muted-foreground">
                            Can create and manage systems and services
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
