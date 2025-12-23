'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, User, Mail } from 'lucide-react';
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
import { api, type UserProfile } from '@/lib/api';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: UserProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name,
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    try {
      await api.profile.update({ name: data.name });
      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
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
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input {...field} placeholder="John Doe" className="pl-10" />
                </div>
              </FormControl>
              <FormDescription>
                Your name as it will appear across the platform.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Email Address</FormLabel>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              value={profile.email}
              className="pl-10"
              disabled
            />
          </div>
          <FormDescription>
            Your email address is used for sign-in and notifications.
            Contact support to change it.
          </FormDescription>
        </FormItem>

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
