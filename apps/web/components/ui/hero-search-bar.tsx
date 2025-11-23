"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Search, Briefcase, Wrench, ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { FaGoogle, FaAws, FaMicrosoft, FaLinkedin } from "react-icons/fa";
import { isSecondaryClient } from "@/lib/domain";
import Link from "next/link";
import { slugify } from "@/lib/slugify";
import type { JobsSearchResponse, ScoredJob } from "@/types/job";

type TabType = "jobs" | "services" | "tasks";

export function HeroSearchBar() {
  const t = useTranslations("HeroSearchBar");
  const [activeTab, setActiveTab] = useState<TabType>("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobsResults, setJobsResults] = useState<ScoredJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const isSecondary = isSecondaryClient();

  const handleSearch = async () => {
    const searchParams = new URLSearchParams();
    if (searchQuery) {
      searchParams.set("search", searchQuery);
    }

    if (activeTab !== "jobs") {
      const routes = {
        jobs: `/jobs?${searchParams.toString()}`,
        services: `/services?${searchParams.toString()}`,
        tasks: `/tasks?${searchParams.toString()}`,
      };

      const route = isSecondary
        ? `/jobs?${searchParams.toString()}`
        : routes[activeTab];
      window.location.href = route;
      return;
    }

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setJobsError("Please enter a search query.");
      setJobsResults([]);
      return;
    }

    setJobsLoading(true);
    setJobsError(null);

    try {
      const response = await fetch("/api/jobs/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: trimmedQuery,
          topKDense: 25,
          topKFinal: 3,
        }),
      });

      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
          const data = (await response.json()) as {
            error?: string;
            details?: string;
          };
          if (data.error) {
            message = data.details
              ? `${data.error}: ${data.details}`
              : data.error;
          }
        } catch {
          // ignore JSON parse errors and keep default message
        }
        throw new Error(message);
      }

      const data = (await response.json()) as JobsSearchResponse;
      // Ensure we only render the top 3 results, even if the API returns more.
      setJobsResults(data.results.slice(0, 3));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error occurred.";
      setJobsError(message);
      setJobsResults([]);
    } finally {
      setJobsLoading(false);
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
    <div
      className="-mx-4 w-screen max-w-none sm:mx-0 md:max-w-2xl md:mx-auto"
      
    >
      <div className="overflow-hidden bg-white rounded-2xl">
        {/* Tabs Header - Full width to match search content */}
        <div className="px-4 pt-3 pb-2 md:px-6 md:pt-4">
          {!isSecondary && (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as TabType)}
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

        {/* Search Content - Increased height */}
        <div className="px-4 pb-3 md:px-6 md:pb-4">
          <div className="relative">
            {/* Search Input */}
            <div className="relative flex-1">
              <Input
                placeholder={t("placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pr-12 pl-8 h-11 text-sm rounded-full border-gray-200 md:h-12 md:text-base md:pr-24 focus:!border-none focus:!ring-1 focus:!ring-black"
              />
            </div>

            {/* Search Button - Always inside on both mobile and desktop */}
            <Button
              onClick={handleSearch}
              className="absolute right-1 top-1/2 px-2 h-9 text-sm font-medium text-white bg-black rounded-full transform -translate-y-1/2 w-fit hover:bg-gray-800 focus:ring-black md:px-4 md:h-10"
            >
              <Search className="size-4" />
              <span className="hidden md:inline md:ml-1 md:pr-2">
                {t("search")}
              </span>
            </Button>
          </div>

          {activeTab === "jobs" && (
            <div className="mt-3 space-y-2 text-xs">
              <p className="text-[11px] text-gray-500">
                AI‑enhanced search shows the <span className="font-semibold">3 closest job matches</span> to your query.
              </p>

              {jobsLoading && (
                <p className="text-gray-600">Finding the best AI job matches…</p>
              )}

              {!jobsLoading && jobsError && (
                <p className="text-red-600">{jobsError}</p>
              )}

              {!jobsLoading &&
                !jobsError &&
                jobsResults.length === 0 &&
                searchQuery.trim().length > 0 && (
                  <p className="text-gray-500">
                    No matching jobs found yet. Try different keywords or a broader role.
                  </p>
                )}

              {!jobsLoading && jobsResults.length > 0 && (
                <ul className="mt-1 space-y-2">
                  {jobsResults.map((job) => (
                    <li key={job.id}>
                      <HeroJobResultCard job={job} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
    </div>
  );
}

function HeroJobResultCard({ job }: { job: ScoredJob }) {
  const href = `/jobs/apply/${slugify(job.title)}/${job.id}`;

  return (
    <Link href={href} className="block">
      <div className="flex flex-col gap-1 px-3 py-2 bg-white rounded-xl border border-gray-200 transition-colors hover:border-gray-300 hover:bg-gray-50">
        <div className="flex gap-2 justify-between items-start">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
              {job.title}
            </h3>
            <p className="text-[11px] text-gray-600 line-clamp-1">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-gray-700 line-clamp-2">
          {job.description}
        </p>
        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {job.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

