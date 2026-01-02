'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, Building2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { api, type Organization } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';

const organizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
});

interface OrganizationFormProps {
  organization: Organization;
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { userRole } = useAuth();
  const isOwner = userRole === 'owner';

  const form = useForm({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization.name,
    },
  });

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      await api.organization.update({
        name: data.name as string,
      });
      toast.success('Organization updated successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    placeholder="Acme Corporation"
                    className={isOwner ? "pl-10" : "pl-10 pr-10"}
                    disabled={!isOwner}
                  />
                  {!isOwner && (
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </FormControl>
              <FormDescription>
                {isOwner
                  ? 'This is the display name for your organization.'
                  : 'Only the organization owner can change this.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
