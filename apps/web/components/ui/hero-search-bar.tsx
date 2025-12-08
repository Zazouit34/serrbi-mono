"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Search, Briefcase, Wrench, ClipboardList, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { FaGoogle, FaAws, FaMicrosoft, FaLinkedin } from "react-icons/fa";
import { isSecondaryClient } from "@/lib/domain";
import Link from "next/link";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";
import { trpc } from "@/app/_trpc/client";

type TabType = "jobs" | "services" | "tasks";

export function HeroSearchBar() {
  const t = useTranslations("HeroSearchBar");
  const [activeTab, setActiveTab] = useState<TabType>("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const isSecondary = isSecondaryClient();

  // Jobs query (manual trigger)
  const jobsQuery = trpc.job.getJob.useQuery(
    {
      page: 1,
      pageSize: 3,
      search: searchQuery || undefined,
    },
    { enabled: false, refetchOnWindowFocus: false },
  );

  // Services query (manual trigger)
  const servicesQuery = trpc.service.getService.useQuery(
    {
      page: 1,
      pageSize: 3,
      search: searchQuery || undefined,
    },
    { enabled: false, refetchOnWindowFocus: false },
  );

  // Tasks query (manual trigger)
  const tasksQuery = trpc.task.getTask.useQuery(
    {
      page: 1,
      pageSize: 3,
      search: searchQuery || undefined,
    },
    { enabled: false, refetchOnWindowFocus: false },
  );

  const isSearching =
    jobsQuery.isFetching || servicesQuery.isFetching || tasksQuery.isFetching;

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
      // Clear results if user cleared the search
      setHasSearched(false);
      return;
    }

    setHasSearched(true);

    try {
      if (activeTab === "jobs") {
        await jobsQuery.refetch();
      } else if (activeTab === "services") {
        await servicesQuery.refetch();
      } else if (activeTab === "tasks") {
        await tasksQuery.refetch();
      }
    } catch {
      // Errors are exposed via query.error; we show generic messages in UI
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

  const companyIcons = [
    { icon: FaGoogle, name: "Google" },
    { icon: FaAws, name: "AWS" },
    { icon: FaMicrosoft, name: "Microsoft" },
    { icon: FaLinkedin, name: "LinkedIn" },
  ];

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
      <div className="px-4 md:px-6 md:pb-4">
        <div className="flex flex-col gap-4 p-4 mx-auto w-full bg-white rounded-3xl border shadow md:p-6">
          {/* Ask AI header */}
          <h2 className="flex gap-2 items-center text-sm font-semibold text-gray-900">
            <Sparkles size={16} className="text-violet-500" />
            <span className="bg-gradient-to-r from-[#7f5cff] to-[#ba9cff] text-transparent bg-clip-text">
              {t("askAiTitle")}
            </span>
          </h2>

          {/* AI-style search bar */}
          <div className="flex justify-between items-center px-2 h-12 text-gray-400 rounded-full border border-gray-200">
            <Input
              placeholder={t("placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isSearching) {
                  void handleSearch();
                }
              }}
              className="flex-1 px-0 pl-4 h-10 text-sm text-gray-900 bg-transparent border-none shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching}
              className="flex gap-1 items-center px-3 ml-2 h-9 text-sm font-medium text-white bg-black rounded-full md:px-4 md:h-10 hover:bg-gray-800 focus:ring-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Search className="size-4" />
              <span className="hidden md:inline md:ml-1 md:pr-1">
                {isSearching ? t("searching") : t("search")}
              </span>
            </Button>
          </div>

          {/* Jobs results */}
          {activeTab === "jobs" && (
            <div className="mt-1 space-y-2 text-xs">
              {!isSearching && hasSearched && jobsQuery.error && (
                <p className="text-red-600">
                  {t("searchError")}
                </p>
              )}

              {!isSearching &&
                hasSearched &&
                !jobsQuery.error &&
                (jobsQuery.data?.items.length ?? 0) === 0 && (
                  <p className="text-gray-500">
                    {t("noResults.jobs")}
                  </p>
                )}

              {!isSearching &&
                jobsQuery.data &&
                jobsQuery.data.items.length > 0 && (
                  <>
                    {/* Mobile: horizontal scroll */}
                    <div className="flex overflow-x-auto gap-3 pb-2 mt-2 md:hidden">
                      {jobsQuery.data.items.map((job: any) => (
                        <div
                          key={job.id}
                          className="min-w-[260px] max-w-[280px] flex-shrink-0"
                        >
                          <JobCard
                            job={{
                              id: job.id,
                              title: job.title,
                              companyName: job.companyName ?? null,
                              companyImage: job.companyImage ?? null,
                              wage: job.wage ?? null,
                              stateAbbreviation: job.stateAbbreviation ?? null,
                              city: job.city ?? null,
                              type: job.type,
                              experienceLevel: job.experienceLevel,
                              locationRequirement: job.locationRequirement,
                              category: job.category,
                              user: null,
                              createdAt: job.createdAt,
                              description: job.description,
                              status: job.status,
                            }}
                            featured={false}
                            compact
                            className="h-[260px] md:h-full"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Desktop: 3 cards side by side, no scroll */}
                    <div className="hidden gap-3 mt-3 md:grid md:grid-cols-3">
                      {jobsQuery.data.items.map((job: any) => (
                        <div key={job.id} className="h-full">
                          <JobCard
                            job={{
                              id: job.id,
                              title: job.title,
                              companyName: job.companyName ?? null,
                              companyImage: job.companyImage ?? null,
                              wage: job.wage ?? null,
                              stateAbbreviation: job.stateAbbreviation ?? null,
                              city: job.city ?? null,
                              type: job.type,
                              experienceLevel: job.experienceLevel,
                              locationRequirement: job.locationRequirement,
                              category: job.category,
                              user: null,
                              createdAt: job.createdAt,
                              description: job.description,
                              status: job.status,
                            }}
                            featured={false}
                            compact
                            className="h-full"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
            </div>
          )}

          {/* Services results */}
          {activeTab === "services" && (
            <div className="mt-1 space-y-2 text-xs">
              {!isSearching && hasSearched && servicesQuery.error && (
                <p className="text-red-600">
                  {t("searchError")}
                </p>
              )}

              {!isSearching &&
                hasSearched &&
                !servicesQuery.error &&
                (servicesQuery.data?.items.length ?? 0) === 0 && (
                  <p className="text-gray-500">
                    {t("noResults.services")}
                  </p>
                )}

              {!isSearching &&
                servicesQuery.data &&
                servicesQuery.data.items.length > 0 && (
                  <>
                    {/* Mobile: horizontal scroll */}
                    <div className="flex overflow-x-auto gap-3 pb-2 mt-2 md:hidden">
                      {servicesQuery.data.items.map((service: any) => (
                        <div
                          key={service.id}
                          className="min-w-[260px] max-w-[280px] flex-shrink-0"
                        >
                          <Link
                            href={`/services?serviceCategory=${encodeURIComponent(
                              service.serviceCategory ?? "",
                            )}`}
                          >
                            <ServiceCard
                              service={service}
                              compact
                              className="h-full"
                            />
                          </Link>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: 3 cards side by side */}
                    <div className="hidden gap-3 mt-3 md:grid md:grid-cols-3">
                      {servicesQuery.data.items.map((service: any) => (
                        <div key={service.id} className="h-full">
                          <Link
                            href={`/services?serviceCategory=${encodeURIComponent(
                              service.serviceCategory ?? "",
                            )}`}
                          >
                            <ServiceCard
                              service={service}
                              compact
                              className="h-full"
                            />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </>
                )}
            </div>
          )}

          {/* Tasks results */}
          {activeTab === "tasks" && (
            <div className="mt-1 space-y-2 text-xs">
              {!isSearching && hasSearched && tasksQuery.error && (
                <p className="text-red-600">
                  {t("searchError")}
                </p>
              )}

              {!isSearching &&
                hasSearched &&
                !tasksQuery.error &&
                (tasksQuery.data?.items.length ?? 0) === 0 && (
                  <p className="text-gray-500">
                    {t("noResults.tasks")}
                  </p>
                )}

              {!isSearching &&
                tasksQuery.data &&
                tasksQuery.data.items.length > 0 && (
                  <>
                    {/* Mobile: horizontal scroll */}
                    <div className="flex overflow-x-auto gap-3 pb-2 mt-2 md:hidden">
                      {tasksQuery.data.items.map((task: any) => (
                        <div
                          key={task.id}
                          className="min-w-[260px] max-w-[280px] flex-shrink-0"
                        >
                          <TaskCard task={task} compact className="h-full" />
                        </div>
                      ))}
                    </div>

                    {/* Desktop: 3 cards side by side */}
                    <div className="hidden gap-3 mt-3 md:grid md:grid-cols-3">
                      {tasksQuery.data.items.map((task: any) => (
                        <div key={task.id} className="h-full">
                          <TaskCard task={task} compact className="h-full" />
                        </div>
                      ))}
                    </div>
                  </>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Company Icons Footer */}
      <div className="px-6 pb-4">
        <div className="flex gap-8 justify-center items-center pt-2">
          {companyIcons.map(({ icon: Icon, name }) => (
            <div key={name} className="flex justify-center items-center">
              <Icon
                className="w-6 h-6 transition-opacity hover:opacity-70"
                title={name}
              />
            </div>
          ))}
        </div>
        {isSecondary && (
          <div className="flex justify-center mt-6">
            <Link href="/jobs">
              <Button className="px-6 h-10 text-white bg-black rounded-full hover:bg-gray-800">
                {t("browseJobs")}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
