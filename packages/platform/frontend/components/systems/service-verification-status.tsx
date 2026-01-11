'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, HelpCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getErrorMessage } from '@/lib/error-utils';

interface ServiceVerificationStatusProps {
  status: 'pending' | 'verified' | 'failed' | null | undefined;
  lastVerifiedAt?: string | null;
  entityCount?: number | null;
  error?: string | null;
}

export function ServiceVerificationStatus({
  status,
  lastVerifiedAt,
  entityCount,
  error,
}: ServiceVerificationStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          label: 'Verified',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200',
        };
      case 'failed':
        return {
          icon: XCircle,
          label: 'Failed',
          variant: 'destructive' as const,
          className: '',
        };
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200',
        };
      default:
        return {
          icon: HelpCircle,
          label: 'Unknown',
          variant: 'outline' as const,
          className: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getTooltipText = () => {
    const parts: string[] = [];

    if (lastVerifiedAt) {
      parts.push(`Last checked: ${formatDistanceToNow(new Date(lastVerifiedAt), { addSuffix: true })}`);
    }

    if (status === 'verified' && entityCount !== null && entityCount !== undefined) {
      parts.push(`${entityCount} entities detected`);
    }

    if (status === 'failed' && error) {
      parts.push(`Error: ${getErrorMessage(error)}`);
    }

    if (status === 'pending') {
      parts.push('Verification in progress...');
    }

    if (!status) {
      parts.push('Not yet verified');
    }

    return parts.join(' | ');
  };

  return (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1 cursor-help ${config.className}`}
      title={getTooltipText()}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
