"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Briefcase, Wrench, ClipboardList, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { isSecondaryClient } from "@/lib/domain";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";
import { PreviewCards } from "@/components/ui/preview-cards";
import { trpc } from "@/app/_trpc/client";
import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { taskCategoryValues } from "@workspace/ui/lib/task-enum";

type TabType = "jobs" | "services" | "tasks";

const jobCategories = jobCategoryValues;
const serviceCategories = serviceCategoryValues;
const taskCategories = taskCategoryValues;

type JobCategory = (typeof jobCategoryValues)[number];
type ServiceCategory = (typeof serviceCategoryValues)[number];
type TaskCategory = (typeof taskCategoryValues)[number];

const jobCategoryIcons = require("@/components/ui/config/job-filters-config").jobCategoryIcons ?? {};
const serviceCategoryIcons = require("@/components/ui/config/service-filters-config").categoryIcons ?? {};
const taskCategoryIcons = require("@/components/ui/config/task-filter-config").taskCategoryIcons ?? {};

export type HeroPreviewData = {
  items: any[];
  type: TabType;
  isLoading: boolean;
  title: string;
};

type HeroSearchBarProps = {
  onPreviewChange?: (data: HeroPreviewData) => void;
};

function HeroSearchBarComponent({ onPreviewChange }: HeroSearchBarProps) {
  const t = useTranslations("HeroSearchBar");
  const tAll = useTranslations();
  const [activeTab, setActiveTab] = useState<TabType>("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    JobCategory | ServiceCategory | TaskCategory | undefined
  >(undefined);
  const isSecondary = isSecondaryClient();

  // Preview queries (always on, 12 max)
  const previewJobsQuery = trpc.job.getJob.useQuery(
    { page: 1, pageSize: 12, search: searchQuery || undefined, category: activeTab === "jobs" ? (selectedCategory as JobCategory | undefined) : undefined },
    { refetchOnWindowFocus: false },
  );
  const previewServicesQuery = trpc.service.getService.useQuery(
    {
      page: 1,
      pageSize: 12,
      search: searchQuery || undefined,
      serviceCategory: activeTab === "services" ? (selectedCategory as ServiceCategory | undefined) : undefined,
    },
    { refetchOnWindowFocus: false },
  );
  const previewTasksQuery = trpc.task.getTask.useQuery(
    { page: 1, pageSize: 12, search: searchQuery || undefined, category: activeTab === "tasks" ? (selectedCategory as TaskCategory | undefined) : undefined },
    { refetchOnWindowFocus: false },
  );

  // Search result queries (manual, wider pageSize to filter top 6)
  const searchJobsQuery = trpc.job.getJob.useQuery(
    { page: 1, pageSize: 60, search: searchQuery || undefined, category: activeTab === "jobs" ? (selectedCategory as JobCategory | undefined) : undefined },
    { enabled: false, refetchOnWindowFocus: false },
  );
  const searchServicesQuery = trpc.service.getService.useQuery(
    {
      page: 1,
      pageSize: 60,
      search: searchQuery || undefined,
      serviceCategory: activeTab === "services" ? (selectedCategory as ServiceCategory | undefined) : undefined,
    },
    { enabled: false, refetchOnWindowFocus: false },
  );
  const searchTasksQuery = trpc.task.getTask.useQuery(
    { page: 1, pageSize: 60, search: searchQuery || undefined, category: activeTab === "tasks" ? (selectedCategory as TaskCategory | undefined) : undefined },
    { enabled: false, refetchOnWindowFocus: false },
  );

  const isSearching =
    searchJobsQuery.isFetching ||
    searchServicesQuery.isFetching ||
    searchTasksQuery.isFetching;

  const handleSearch = async (overrideQuery?: string) => {
    const effectiveQuery = (overrideQuery ?? searchQuery).trim();

    // For the secondary client, keep simple redirect behavior
    if (isSecondary) {
      const searchParams = new URLSearchParams();
      if (effectiveQuery) {
        searchParams.set("search", effectiveQuery);
      }
      const routes: Record<TabType, string> = {
        jobs: `/jobs?${searchParams.toString()}`,
        services: `/services?${searchParams.toString()}`,
        tasks: `/tasks?${searchParams.toString()}`,
      };
      const route = routes[activeTab] ?? routes.jobs;
      window.location.href = route;
      return;
    }

    if (!effectiveQuery) {
      setHasSearched(false);
      return;
    }

    setHasSearched(true);

    try {
      if (activeTab === "jobs") {
        await searchJobsQuery.refetch();
      } else if (activeTab === "services") {
        await searchServicesQuery.refetch();
      } else if (activeTab === "tasks") {
        await searchTasksQuery.refetch();
      }
    } catch {
      // Errors are surfaced via query.error
    }
  };

  const tabLabels = {
    jobs: t("tabs.jobs"),
    services: t("tabs.services"),
    tasks: t("tabs.tasks"),
  } as const;

  const tabIcons: Record<TabType, any> = {
    jobs: Briefcase,
    services: Wrench,
    tasks: ClipboardList,
  };

  const renderSearchCards = () => {
    let items: any[] = [];
    let error: unknown = null;

    if (activeTab === "jobs") {
      items = searchJobsQuery.data?.items ?? [];
      error = searchJobsQuery.error;
    } else if (activeTab === "services") {
      items = searchServicesQuery.data?.items ?? [];
      error = searchServicesQuery.error;
    } else {
      items = searchTasksQuery.data?.items ?? [];
      error = searchTasksQuery.error;
    }

    const topItems = items.slice(0, 6);

    if (!isSearching && hasSearched && error) {
      return <p className="text-xs text-red-600">{t("searchError")}</p>;
    }

    if (!isSearching && hasSearched && topItems.length === 0) {
      const noKey =
        activeTab === "jobs"
          ? "noResults.jobs"
          : activeTab === "services"
            ? "noResults.services"
            : "noResults.tasks";
      return <p className="text-xs text-gray-500">{t(noKey as any)}</p>;
    }

    if (!hasSearched || topItems.length === 0) return null;

    return (
      <div className="mt-2">
        <div className="grid gap-3 md:grid-cols-3">
          {topItems.map((item: any) => {
            if (activeTab === "jobs") {
              return (
                <JobCard
                  key={item.id}
                  job={{
                    id: item.id,
                    title: item.title,
                    companyName: item.companyName ?? null,
                    companyImage: item.companyImage ?? null,
                    wage: item.wage ?? null,
                    stateAbbreviation: item.stateAbbreviation ?? null,
                    city: item.city ?? null,
                    type: item.type,
                    experienceLevel: item.experienceLevel,
                    locationRequirement: item.locationRequirement,
                    category: item.category,
                    user: null,
                    createdAt: item.createdAt,
                    description: item.description,
                    status: item.status,
                  }}
                  featured={false}
                  compact
                  className="h-full"
                />
              );
            }
            if (activeTab === "services") {
              return (
                <Link
                  key={item.id}
                  href={`/services?serviceCategory=${encodeURIComponent(item.serviceCategory ?? "")}`}
                >
                  <ServiceCard service={item} compact className="h-full" />
                </Link>
              );
            }
            return (
              <TaskCard key={item.id} task={item} compact className="h-full" />
            );
          })}
        </div>
      </div>
    );
  };

  const categoryList = useMemo(() => {
    if (activeTab === "jobs") return jobCategories;
    if (activeTab === "services") return serviceCategories;
    return taskCategories;
  }, [activeTab]);

  const previewData = useMemo(() => {
    if (activeTab === "jobs") {
      return {
        items: previewJobsQuery.data?.items ?? [],
        loading: previewJobsQuery.isLoading,
        type: "jobs" as const,
      };
    }
    if (activeTab === "services") {
      return {
        items: previewServicesQuery.data?.items ?? [],
        loading: previewServicesQuery.isLoading,
        type: "services" as const,
      };
    }
    return {
      items: previewTasksQuery.data?.items ?? [],
      loading: previewTasksQuery.isLoading,
      type: "tasks" as const,
    };
  }, [
    activeTab,
    previewJobsQuery.data?.items,
    previewJobsQuery.isLoading,
    previewServicesQuery.data?.items,
    previewServicesQuery.isLoading,
    previewTasksQuery.data?.items,
    previewTasksQuery.isLoading,
  ]);

  useEffect(() => {
    if (!onPreviewChange) return;
    onPreviewChange({
      items: previewData.items,
      type: previewData.type,
      isLoading: previewData.loading,
      title:
        activeTab === "jobs"
          ? t("jobsHint")
          : activeTab === "services"
            ? t("servicesHint")
            : t("tasksHint"),
    });
  }, [previewData, activeTab, onPreviewChange, t]);

  return (
    <div className="-mx-4 w-screen max-w-none sm:mx-0 md:max-w-4xl">
      {/* Tabs Header - outside AI border */}
      <div className="px-4 pt-3 pb-2 md:px-6 md:pt-4">
        {!isSecondary && (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as TabType);
              setHasSearched(false);
              setSelectedCategory(undefined);
            }}
          >
            <div className="overflow-x-auto no-scrollbar">
              <TabsList className="flex-nowrap justify-start w-full h-10 whitespace-nowrap bg-white rounded-full border border-gray-200 md:h-12">
                {(["jobs", "services", "tasks"] as TabType[]).map((tab) => {
                  const Icon = tabIcons[tab];
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="gap-2 px-3 text-gray-400 data-[state=active]:text-[#000000] data-[state=active]:border-gray-200 data-[state=active]:bg-transparent rounded-full text-xs md:text-base min-w-[84px] md:min-w-0"
                    >
                      <Icon className="size-4 md:size-5" />
                      <span className="hidden font-medium md:inline">
                        {tabLabels[tab]}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </Tabs>
        )}
      </div>

      {/* Search Content - Ask AI panel + suggestions + results, inside its own border */}
      <div className="px-4 md:px-6 md:pb-0">
        <div className="flex flex-col gap-4 mx-auto w-full">
          {/* Chat-like search bar */}
          <div className="relative w-full">
            <div className="flex flex-1 items-center pl-4 pr-16 py-3 min-h-[68px] bg-white border border-gray-200 rounded-2xl shadow-sm">
              <Input
                placeholder={t("placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSearching) {
                    void handleSearch();
                  }
                }}
                className="flex-1 px-0 text-sm text-gray-900 bg-transparent border-none shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching}
              className="absolute bottom-2 right-2 flex items-center justify-center h-12 w-12 rounded-xl bg-[#f4f4f5] border border-gray-200 disabled:opacity-60"
            >
              <Image src="/icons/arrow.svg" alt="Send" width={20} height={20} />
            </button>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {categoryList.map((option: string) => {
              const icons =
                activeTab === "jobs"
                  ? jobCategoryIcons
                  : activeTab === "services"
                    ? serviceCategoryIcons
                    : taskCategoryIcons;
              const labelKeyPrefix =
                activeTab === "jobs"
                  ? "Enums.JobCategory."
                  : activeTab === "services"
                    ? "Enums.ServiceCategory."
                    : "Enums.TaskCategory.";
              const IconComponent = icons[option as keyof typeof icons];
              const isSelected = selectedCategory === option;
              return (
                <button
                  key={option}
                  onClick={() => {
                    setSelectedCategory(isSelected ? undefined : (option as JobCategory | ServiceCategory | TaskCategory));
                    setHasSearched(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                  {tAll((labelKeyPrefix + option) as any)}
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
                    </div>

          {/* Search results (semantic/keyword) */}
          <div className="text-xs">{renderSearchCards()}</div>
        </div>
      </div>
      {isSecondary && (
      <div className="px-6 pb-4">
          <div className="flex justify-center">
            <Link href="/jobs">
              <Button className="px-6 h-10 text-white bg-black rounded-full hover:bg-gray-800">
                {t("browseJobs")}
              </Button>
            </Link>
          </div>
          </div>
        )}
    </div>
  );
}

type HeroSearchBarComponentType = typeof HeroSearchBarComponent & {
  Preview: typeof PreviewCards;
};

const HeroSearchBar = Object.assign(HeroSearchBarComponent, {
  Preview: PreviewCards,
}) as HeroSearchBarComponentType;

export { HeroSearchBar };
