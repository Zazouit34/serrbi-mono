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

  const handleSearch = async (overrideQuery?: string) => {
    const effectiveQuery = overrideQuery ?? searchQuery;
    const searchParams = new URLSearchParams();
    if (effectiveQuery) {
      searchParams.set("search", effectiveQuery);
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

    const trimmedQuery = effectiveQuery.trim();
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

  const handleSuggestionClick = (value: string) => {
    setSearchQuery(value);
    void handleSearch(value);
  };

  const suggestionsByTab: Record<TabType, string[]> = {
    jobs: [
      "Frontend developer in Casablanca",
      "Remote React developer role",
      "Junior marketing job in Rabat",
    ],
    services: [
      "Lawyer in Casablanca",
      "Plumber near Marrakech",
      "Doctor in Rabat",
    ],
    tasks: [
      "Cleaning job in Casablanca",
      "Construction help this weekend",
      "Tech support task remote",
    ],
  };

  const currentSuggestions = suggestionsByTab[activeTab];

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
    <div className="-mx-4 w-screen max-w-none sm:mx-0 md:max-w-2xl md:mx-auto">
      {/* Tabs Header - outside AI border */}
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

      {/* Search Content - Ask AI panel + suggestions + results, inside its own border */}
      <div className="px-4 md:px-6 md:pb-4">
        <div className="w-full md:w-[600px] mx-auto flex flex-col gap-4 rounded-3xl border bg-white shadow p-4 md:p-6">
          {/* Ask AI header */}
          <h2 className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-[#7f5cff] to-[#ba9cff] text-transparent bg-clip-text">
            <Sparkles size={16} /> Ask AI
          </h2>

          {/* AI-style search bar */}
          <div className="flex justify-between items-center px-3 h-12 text-gray-400 bg-gray-100 rounded-2xl">
            <Input
              placeholder={t("placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 px-0 h-10 text-sm text-gray-900 bg-transparent border-none shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="button"
              onClick={() => handleSearch()}
              className="flex gap-1 items-center px-3 ml-2 h-9 text-sm font-medium text-white bg-black rounded-full md:px-4 md:h-10 hover:bg-gray-800 focus:ring-black"
            >
              <Search className="size-4" />
              <span className="hidden md:inline md:ml-1 md:pr-1">
                {t("search")}
              </span>
            </Button>
          </div>

          {/* Tab-aware AI suggestions */}
          <div className="flex flex-wrap gap-2">
            {currentSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 rounded-full border text-[11px] text-gray-500 hover:bg-gray-100 transition"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Jobs AI results */}
          {activeTab === "jobs" && (
            <div className="mt-1 space-y-2 text-xs">
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
                <div className="flex overflow-x-auto gap-3 pb-1 mt-2">
                  {jobsResults.map((job) => (
                    <div
                      key={job.id}
                      className="min-w-[260px] max-w-[280px] flex-shrink-0"
                    >
                      <JobCard
                        job={{
                          id: job.id,
                          title: job.title,
                          companyName: job.company,
                          companyImage: null,
                          wage: null,
                          stateAbbreviation: null,
                          city: job.location ?? null,
                          type: "full_time",
                          experienceLevel: "junior",
                          locationRequirement: "in_office",
                          category: undefined,
                          user: null,
                          createdAt: undefined,
                          description: job.description,
                          status: undefined,
                        }}
                        featured={false}
                        compact
                        className="h-full"
                      />
                    </div>
                  ))}
                </div>
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
