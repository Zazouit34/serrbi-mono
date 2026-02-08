"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Briefcase, Wrench, ClipboardList, Check, Paperclip, Brain, FileText, Shuffle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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

const MAX_PAGE_SIZE = 50;
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
  hasSearched: boolean;
  isSearchMode: boolean;
  onLoadMore?: () => void;
  loadMoreLabel?: string;
};

type HeroSearchBarProps = {
  onPreviewChange?: (data: HeroPreviewData) => void;
};

function HeroSearchBarComponent({ onPreviewChange }: HeroSearchBarProps) {
  const t = useTranslations("HeroSearchBar");
  const tAll = useTranslations();
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user?.email;
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabType>("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [previewPageSize, setPreviewPageSize] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState<
    JobCategory | ServiceCategory | TaskCategory | undefined
  >(undefined);
  const isSecondary = isSecondaryClient();

  const selectedJobCategory =
    activeTab === "jobs" ? (selectedCategory as JobCategory | undefined) : undefined;
  const selectedServiceCategory =
    activeTab === "services" ? (selectedCategory as ServiceCategory | undefined) : undefined;
  const selectedTaskCategory =
    activeTab === "tasks" ? (selectedCategory as TaskCategory | undefined) : undefined;

  // Preview queries (always on)
  const previewJobsQuery = trpc.job.getJob.useQuery(
    {
      page: 1,
      pageSize: Math.min(previewPageSize, MAX_PAGE_SIZE),
      search: undefined,
      category: selectedJobCategory,
    },
    { refetchOnWindowFocus: false },
  );
  const previewServicesQuery = trpc.service.getService.useQuery(
    {
      page: 1,
      pageSize: Math.min(previewPageSize, MAX_PAGE_SIZE),
      search: undefined,
      serviceCategory: selectedServiceCategory,
    },
    { refetchOnWindowFocus: false },
  );
  const previewTasksQuery = trpc.task.getTask.useQuery(
    {
      page: 1,
      pageSize: Math.min(previewPageSize, MAX_PAGE_SIZE),
      search: undefined,
      category: selectedTaskCategory,
    },
    { refetchOnWindowFocus: false },
  );

  const handleLoadMorePreview = () => {
    setPreviewPageSize((prev) => Math.min(prev + 12, MAX_PAGE_SIZE));
  };

  // Search result queries (manual, wider pageSize to filter top 6)
  const searchJobsQuery = trpc.job.getJob.useQuery(
    {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
      search: searchQuery || undefined,
      category: selectedJobCategory,
    },
    { enabled: false, refetchOnWindowFocus: false },
  );
  const searchServicesQuery = trpc.service.getService.useQuery(
    {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
      search: searchQuery || undefined,
      serviceCategory: selectedServiceCategory,
    },
    { enabled: false, refetchOnWindowFocus: false },
  );
  const searchTasksQuery = trpc.task.getTask.useQuery(
    {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
      search: searchQuery || undefined,
      category: selectedTaskCategory,
    },
    { enabled: false, refetchOnWindowFocus: false },
  );

  const isSearching =
    searchJobsQuery.isFetching ||
    searchServicesQuery.isFetching ||
    searchTasksQuery.isFetching;

  const handleSearch = async (overrideQuery?: string) => {
    const effectiveQuery = (overrideQuery ?? searchQuery).trim();

    if (!isLoggedIn) {
      const callback = pathname || "/";
      router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }

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

  const categoryList = useMemo(() => {
    if (activeTab === "jobs") return jobCategories;
    if (activeTab === "services") return serviceCategories;
    return taskCategories;
  }, [activeTab]);

  const previewItems = useMemo(() => {
    if (activeTab === "jobs") {
      return { items: previewJobsQuery.data?.items ?? [], loading: previewJobsQuery.isLoading };
    }
    if (activeTab === "services") {
      return { items: previewServicesQuery.data?.items ?? [], loading: previewServicesQuery.isLoading };
    }
    return { items: previewTasksQuery.data?.items ?? [], loading: previewTasksQuery.isLoading };
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

    const isSearchMode = hasSearched && !!searchQuery.trim();
    const loading = isSearchMode
      ? activeTab === "jobs"
        ? searchJobsQuery.isFetching
        : activeTab === "services"
          ? searchServicesQuery.isFetching
          : searchTasksQuery.isFetching
      : previewItems.loading;

    const searchItems =
      activeTab === "jobs"
        ? (searchJobsQuery.data?.items ?? []).slice(0, 6)
        : activeTab === "services"
          ? (searchServicesQuery.data?.items ?? []).slice(0, 6)
          : (searchTasksQuery.data?.items ?? []).slice(0, 6);

    onPreviewChange({
      items: isSearchMode ? searchItems : previewItems.items,
      type: activeTab,
      isLoading: loading,
      title:
        activeTab === "jobs"
          ? t("jobsHint")
          : activeTab === "services"
            ? t("servicesHint")
            : t("tasksHint"),
      hasSearched,
      isSearchMode,
      onLoadMore: isSearchMode ? undefined : handleLoadMorePreview,
      loadMoreLabel: t("loadMore"),
    });
  }, [
    hasSearched,
    searchQuery,
    activeTab,
    onPreviewChange,
    t,
    previewItems,
    searchJobsQuery.data?.items,
    searchServicesQuery.data?.items,
    searchTasksQuery.data?.items,
    searchJobsQuery.isFetching,
    searchServicesQuery.isFetching,
    searchTasksQuery.isFetching,
  ]);

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
              setPreviewPageSize(12);
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
          {/* Chat-like search box */}
          <div className="relative p-3 w-full bg-white min-h-[180px] rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <Input
                placeholder={t("placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-0 text-sm text-gray-900 bg-transparent border-none shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="flex gap-2 justify-between items-center mt-3">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/resume-analyzer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-white transition"
                >
                  <FileText className="w-4 h-4 text-gray-500" />
                  {tAll("Routes.resumeAnalyzer")}
                </Link>
                <Link
                  href="/account/auto-apply"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-white transition"
                >
                  <Brain className="w-4 h-4 text-gray-500" />
                  {tAll("Routes.autoApply")}
                </Link>
                <Link
                  href="/career-switch"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-white transition"
                >
                  <Shuffle className="w-4 h-4 text-gray-500" />
                  {tAll("Routes.careerSwitch")}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={isSearching}
                className="flex justify-center items-center w-12 h-8 rounded-lg border border-gray-200 disabled:opacity-60"
              >
                <Image 
                  src="/icons/arrow.svg" 
                  alt="Send" 
                  width={20} 
                  height={20}
                  className={dir === 'rtl' ? 'rotate-180' : ''}
                />
              </button>
            </div>
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
                    const nextCategory = isSelected ? undefined : (option as JobCategory | ServiceCategory | TaskCategory);
                    setSelectedCategory(nextCategory);
                    setPreviewPageSize(12);

                    // If user already searched, re-run search with the new category; otherwise just filter previews.
                    const hasQuery = !!searchQuery.trim();
                    if (hasQuery) {
                      setHasSearched(true);
                      if (activeTab === "jobs") {
                        void searchJobsQuery.refetch();
                      } else if (activeTab === "services") {
                        void searchServicesQuery.refetch();
                      } else {
                        void searchTasksQuery.refetch();
                      }
                    } else {
                      setHasSearched(false);
                    }
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
