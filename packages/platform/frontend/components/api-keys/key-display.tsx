'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function KeyDisplay({ secretKey, onClose }: { secretKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    toast.success('API key copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
        Make sure to copy your API key now. You won't be able to see it again!
      </div>
      <div className="flex gap-2">
        <Input value={secretKey} readOnly className="font-mono text-sm" />
        <Button onClick={handleCopy} variant="outline" size="icon">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <Button onClick={onClose} className="w-full">
        I've saved the key
      </Button>
    </div>
  );
}
