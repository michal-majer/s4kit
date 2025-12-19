'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, System, SystemService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, Database } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface ServicePreviewProps {
  system: System;
  service: SystemService;
}

export function ServicePreview({ system, service }: ServicePreviewProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshEntities = async () => {
    setRefreshing(true);
    try {
      const result = await api.systemServices.refreshEntities(service.id);
      toast.success(`Refreshed ${result.refreshedCount || result.entities?.length || 0} entities`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh entities');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/systems/${system.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to System
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{service.name}</CardTitle>
              <CardDescription className="mt-1">
                <Badge variant="secondary" className="mr-2">
                  {service.alias}
                </Badge>
                {service.description || 'OData service for ' + system.name}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleRefreshEntities}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Entities
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Service Path</p>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono block mt-1">
                {service.servicePath}
              </code>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">System</p>
              <p className="text-sm mt-1">{system.name}</p>
            </div>
            {service.authType && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Auth Type</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {service.authType}
                </Badge>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entities Count</p>
              <Badge variant="outline" className="mt-1">
                {service.entities?.length || 0} entities
              </Badge>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Entities</h3>
              <Badge variant="secondary">{service.entities?.length || 0} total</Badge>
            </div>
            {service.entities && service.entities.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {service.entities.map((entity, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <code className="text-sm font-mono">{entity}</code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No entities found</p>
                <p className="text-sm mt-1">Click "Refresh Entities" to fetch entities from the service metadata</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
