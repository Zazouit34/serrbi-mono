"use client";

import { trpc } from "@/app/_trpc/client";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";

export function FavoriteListing() {
  const { data: jobFavorites, isLoading: jobsLoading } = trpc.favorite.getFavorites.useQuery({
    page: 1,
    pageSize: 20,
    type: "job",
  });

  const { data: serviceFavorites, isLoading: servicesLoading } = trpc.favorite.getFavorites.useQuery({
    page: 1,
    pageSize: 20,
    type: "service",
  });

  const { data: taskFavorites, isLoading: tasksLoading } = trpc.favorite.getFavorites.useQuery({
    page: 1,
    pageSize: 20,
    type: "task",
  });

  const LoadingGrid = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-64 bg-gray-200 rounded-3xl animate-pulse" />
      ))}
    </div>
  );

  const EmptySection = ({ type }: { type: string }) => (
    <p className="py-8 text-sm text-gray-400">No favorite {type} yet</p>
  );

  return (
    <div className="space-y-12">
      {/* Jobs Section */}
      <div>
        <h2 className="mb-6 text-2xl font-semibold text-gray-900">Jobs</h2>
        {jobsLoading ? (
          <LoadingGrid />
        ) : jobFavorites?.items.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {jobFavorites.items.map((favorite) => (
              <JobCard
                key={`job-${favorite.job?.id}`}
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
        ) : (
          <EmptySection type="jobs" />
        )}
      </div>

      {/* Services Section */}
      <div>
        <h2 className="mb-6 text-2xl font-semibold text-gray-900">Services</h2>
        {servicesLoading ? (
          <LoadingGrid />
        ) : serviceFavorites?.items.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {serviceFavorites.items.map((favorite) => (
              <ServiceCard
                key={`service-${favorite.service?.id}`}
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
        ) : (
          <EmptySection type="services" />
        )}
      </div>

      {/* Tasks Section */}
      <div>
        <h2 className="mb-6 text-2xl font-semibold text-gray-900">Tasks</h2>
        {tasksLoading ? (
          <LoadingGrid />
        ) : taskFavorites?.items.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {taskFavorites.items.map((favorite) => (
              <TaskCard
                key={`task-${favorite.task?.id}`}
                task={{
                  id: favorite.task!.id,
                  description: favorite.task!.description,
                  category: favorite.task!.category,
                  bgStyle: null,
                  budget: favorite.task!.budget,
                  budgetType: favorite.task!.budgetType,
                  city: favorite.task!.city,
                  stateAbbreviation: favorite.task!.stateAbbreviation,
                  phoneNumber: favorite.task!.phoneNumber || null,
                  displayName: favorite.task!.displayName,
                }}
              />
            ))}
          </div>
        ) : (
          <EmptySection type="tasks" />
        )}
      </div>
    </div>
  );
}
