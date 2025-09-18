'use client';

import * as React from 'react';
import { Heart } from 'lucide-react';
import { IconButton } from '@workspace/ui/components/ui/shadcn-io/icon-button';
import { trpc } from '@/app/_trpc/client';
import { toast } from 'sonner';

type FavoriteButtonProps = {
  jobId?: string;
  serviceId?: string;
  taskId?: string;
  className?: string;
  color?: [number, number, number];
};

export const FavoriteButton = ({ jobId, serviceId, taskId, className, color }: FavoriteButtonProps) => {
  // Local state for immediate UI response
  const [optimisticFavorited, setOptimisticFavorited] = React.useState<boolean | null>(null);

  // Check if item is favorited
  const { data: favoriteData } = trpc.favorite.isFavorited.useQuery(
    { jobId, serviceId, taskId },
    { enabled: !!(jobId || serviceId || taskId) }
  );

  const utils = trpc.useUtils();

  // Remove from favorites mutation
  const removeFavorite = trpc.favorite.remove.useMutation({
    onMutate: () => {
      // Optimistic update
      setOptimisticFavorited(false);
    },
    onSuccess: () => {
      toast.success('Removed from favorites');
      // Invalidate ALL favorite queries, not just isFavorited
      utils.favorite.invalidate();
    },
    onError: (error) => {
      // Revert optimistic update on error
      setOptimisticFavorited(null);
      toast.error(error.message || 'Failed to remove from favorites');
    },
  });

  // Add to favorites mutation
  const addFavorite = trpc.favorite.add.useMutation({
    onMutate: () => {
      // Optimistic update
      setOptimisticFavorited(true);
    },
    onSuccess: () => {
      toast.success('Added to favorites');
      // Invalidate ALL favorite queries
      utils.favorite.invalidate();
    },
    onError: (error) => {
      // Revert optimistic update on error
      setOptimisticFavorited(null);
      toast.error(error.message || 'Failed to add to favorites');
    },
  });

  // Use optimistic state if available, otherwise use server state
  const isFavorited = optimisticFavorited !== null ? optimisticFavorited : (favoriteData?.isFavorited ?? false);
  const favoriteId = favoriteData?.favoriteId;

  const handleToggle = () => {
    if (isFavorited && favoriteId) {
      removeFavorite.mutate({ id: favoriteId });
    } else {
      addFavorite.mutate({ jobId, serviceId, taskId });
    }
  };

  return (
    <IconButton
      icon={Heart}
      active={isFavorited}
      color={color}
      size="md"
      onClick={handleToggle}
      className={className}
    />
  );
};

export default FavoriteButton;