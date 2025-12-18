'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { api, Connection } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const connectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  baseUrl: z.string().url('Must be a valid URL'),
  authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']),
  environment: z.enum(['dev', 'staging', 'prod']),
  username: z.string().optional(),
  password: z.string().optional(),
}).refine((data) => {
  if (data.authType === 'none') return true;
  return !!(data.username && data.password);
}, { message: 'Username and password required', path: ['username'] });

type ConnectionFormData = z.infer<typeof connectionSchema>;

interface EditConnectionDialogProps {
  connection: Connection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditConnectionDialog({ connection, open, onOpenChange }: EditConnectionDialogProps) {
  const router = useRouter();

  const form = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      name: connection.name,
      baseUrl: connection.baseUrl,
      authType: connection.authType,
      environment: connection.environment,
      username: '',
      password: '',
    },
  });

  useEffect(() => {
    if (open && connection) {
      form.reset({
        name: connection.name,
        baseUrl: connection.baseUrl,
        authType: connection.authType,
        environment: connection.environment,
        username: '',
        password: '',
      });
    }
  }, [open, connection, form]);

  const authType = form.watch('authType');
  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: ConnectionFormData) => {
    try {
      const updateData: any = {
        name: data.name,
        baseUrl: data.baseUrl,
        authType: data.authType,
        environment: data.environment,
      };

      // Only include credentials if provided
      if (data.username && data.password) {
        updateData.username = data.username;
        updateData.password = data.password;
      }

      await api.connections.update(connection.id, updateData);
      toast.success('Connection updated');
      onOpenChange(false);
      form.reset();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update connection';
      toast.error(message);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Connection</DialogTitle>
          <DialogDescription>Update connection settings</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="My SAP System" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL *</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://sap-system.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="environment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Environment *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dev">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="prod">Production</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auth Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (Public)</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {authType !== 'none' && (
              <>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username {authType !== 'none' ? '*' : ''}</FormLabel>
                      <FormControl>
                        <Input placeholder="Leave empty to keep current" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password {authType !== 'none' ? '*' : ''}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Leave empty to keep current" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Connection'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

