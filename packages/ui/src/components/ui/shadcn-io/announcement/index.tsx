import type { ComponentProps, HTMLAttributes } from 'react';
import { Badge } from '@workspace/ui/components/badge';
import { cn } from '@workspace/ui/lib/utils';

export type AnnouncementProps = ComponentProps<typeof Badge> & {
  themed?: boolean;
};

export const Announcement = ({
  variant = 'outline',
  themed = false,
  className,
  ...props
}: AnnouncementProps) => (
  <Badge
    className={cn(
      'group max-w-full gap-2 rounded-full bg-background px-3 py-0.5 font-medium shadow-sm transition-all',
      'hover:shadow-md',
      themed && 'announcement-themed border-foreground/5',
      className
    )}
    variant={variant}
    {...props}
  />
);

export type AnnouncementTagProps = HTMLAttributes<HTMLDivElement>;

export const AnnouncementTag = ({
  className,
  ...props
}: AnnouncementTagProps) => (
  <div
    className={cn(
      '-ml-2.5 shrink-0 truncate rounded-full bg-foreground/5 px-2.5 py-1 text-xs',
      'group-[.announcement-themed]:bg-background/60',
      className
    )}
    {...props}
  />
);

export type AnnouncementTitleProps = HTMLAttributes<HTMLDivElement>;

export const AnnouncementTitle = ({
  className,
  ...props
}: AnnouncementTitleProps) => (
  <div
    className={cn('flex gap-1 items-center py-1 truncate', className)}
    {...props}
  />
);

// New component for right-side content
export type AnnouncementEndProps = HTMLAttributes<HTMLDivElement>;

export const AnnouncementEnd = ({
  className,
  ...props
}: AnnouncementEndProps) => (
  <div
    className={cn(
      'flex items-center py-1 ml-auto shrink-0', // ml-auto pushes it to the right, shrink-0 prevents compression
      className
    )}
    {...props}
  />
);
