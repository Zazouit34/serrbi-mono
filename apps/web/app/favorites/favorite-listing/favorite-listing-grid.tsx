"use client";

import { trpc } from "@/app/_trpc/client";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";

export function FavoriteListingGrid() {
  const { data: favorites, isLoading } = trpc.favorite.getFavorites.useQuery({
    page: 1,
    pageSize: 50,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!favorites?.items.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-500">No favorites yet</p>
        <p className="mt-2 text-sm text-gray-400">
          Start adding items to your favorites to see them here
        </p>
      </div>
    );
  }

  // Separate favorites by type
  const jobFavorites = favorites.items.filter(fav => fav.job);
  const serviceFavorites = favorites.items.filter(fav => fav.service);
  const taskFavorites = favorites.items.filter(fav => fav.task);

  return (
    <div className="space-y-8">
      {/* Job Cards - 3 columns on desktop */}
      {jobFavorites.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {jobFavorites.map((favorite) => (
            <JobCard
              key={`job-${favorite.job!.id}`}
              job={{
                id: favorite.job!.id,
                title: favorite.job!.title,
                companyName: favorite.job!.companyName,
                companyImage: null,
                wage: favorite.job!.wage,
                stateAbbreviation: favorite.job!.stateAbbreviation,
                city: favorite.job!.city,
                type: favorite.job!.type,
                experienceLevel: favorite.job!.experienceLevel,
                locationRequirement: favorite.job!.locationRequirement,
                category: favorite.job!.category,
                createdAt: favorite.job!.createdAt,
                description: favorite.job!.description,
              }}
            />
          ))}
        </div>
      )}

      {/* Service Cards - 4 columns on desktop */}
      {serviceFavorites.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {serviceFavorites.map((favorite) => (
            <ServiceCard
              key={`service-${favorite.service!.id}`}
              service={{
                id: favorite.service!.id,
                title: favorite.service!.title,
                displayImage: favorite.service!.displayImage,
                images: [],
                serviceCategory: favorite.service!.serviceCategory,
                price: favorite.service!.price,
                currency: "MAD",
                stateAbbreviation: favorite.service!.stateAbbreviation,
                city: favorite.service!.city,
                phoneNumber: favorite.service!.phoneNumber || null,
                averageRating: null,
                numberOfReviews: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Task Cards - 4 columns on desktop */}
      {taskFavorites.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {taskFavorites.map((favorite) => (
            <TaskCard
              key={`task-${favorite.task!.id}`}
              task={{
                id: favorite.task!.id,
                description: favorite.task!.description,
                category: favorite.task!.category,
                bgStyle: null,
                budget: favorite.task!.budget,
                city: favorite.task!.city,
                stateAbbreviation: favorite.task!.stateAbbreviation,
                phoneNumber: favorite.task!.phoneNumber || null,
                displayName: favorite.task!.displayName,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
