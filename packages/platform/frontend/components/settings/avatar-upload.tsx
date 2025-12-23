'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AvatarUploadProps {
  currentImage?: string | null;
  name: string;
  onUpload?: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export function AvatarUpload({
  currentImage,
  name,
  onUpload,
  onRemove,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayImage = previewUrl || currentImage;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    try {
      if (onUpload) {
        await onUpload(file);
      } else {
        // Mock upload
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      if (onRemove) {
        await onRemove();
      } else {
        // Mock remove
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      setPreviewUrl(null);
      toast.success('Avatar removed');
    } catch {
      toast.error('Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      {/* Avatar with overlay */}
      <div className="relative group">
        <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
          <AvatarImage src={displayImage || undefined} alt={name} />
          <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        {/* Hover overlay */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'absolute inset-0 flex items-center justify-center rounded-full',
                'bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity',
                'focus:opacity-100 focus:outline-none',
                isUploading && 'opacity-100'
              )}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload new image
            </DropdownMenuItem>
            {displayImage && (
              <DropdownMenuItem
                onClick={handleRemove}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove image
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Instructions */}
      <div className="space-y-1">
        <p className="text-sm font-medium">Profile picture</p>
        <p className="text-sm text-muted-foreground">
          Click on the avatar to upload a new image.
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG or GIF. Max 5MB.
        </p>
      </div>
    </div>
  );
}
