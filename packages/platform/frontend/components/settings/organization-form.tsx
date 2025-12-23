'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, Building2, FileText, Calendar } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, type Organization } from '@/lib/api';

const organizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  defaultLogLevel: z.enum(['minimal', 'standard', 'extended']),
  logRetentionDays: z.coerce.number().int().min(1).max(365),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

interface OrganizationFormProps {
  organization: Organization;
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization.name,
      defaultLogLevel: organization.defaultLogLevel,
      logRetentionDays: organization.logRetentionDays,
    },
  });

  const onSubmit = async (data: OrganizationFormValues) => {
    setIsLoading(true);
    try {
      await api.organization.update({
        name: data.name,
        defaultLogLevel: data.defaultLogLevel,
        logRetentionDays: data.logRetentionDays,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    className="pl-10"
                  />
                </div>
              </FormControl>
              <FormDescription>
                This is the display name for your organization.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="defaultLogLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Log Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select log level" />
                      </div>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="extended">Extended</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Controls how much detail is logged for API requests.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logRetentionDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Log Retention (Days)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      max={365}
                      placeholder="90"
                      className="pl-10"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  How long to keep request logs (1-365 days).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
