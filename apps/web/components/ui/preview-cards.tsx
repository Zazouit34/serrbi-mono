"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/app/_trpc/client";

type PreviewType = "jobs" | "services" | "tasks";

interface PreviewCardsProps {
  title?: string;
  items: any[];
  type: PreviewType;
  isLoading?: boolean;
  isSearchMode?: boolean;
  selectedCategory?: string;
  onTypeChange?: (type: PreviewType) => void;
  onCategoryChange?: (category?: string) => void;
  onLoadMore?: () => void;
  loadMoreLabel?: string;
}

export function PreviewCards({
  title,
  // Legacy props kept for compatibility with existing call sites.
}: PreviewCardsProps) {
  const jobsScrollRef = useRef<HTMLDivElement | null>(null);
  const servicesScrollRef = useRef<HTMLDivElement | null>(null);
  const tasksScrollRef = useRef<HTMLDivElement | null>(null);
  const [jobsIndex, setJobsIndex] = useState(0);
  const [servicesIndex, setServicesIndex] = useState(0);
  const [tasksIndex, setTasksIndex] = useState(0);
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const tNavbar = useTranslations("Navbar");
  const tHero = useTranslations("HeroSearchBar");

  const jobsQuery = trpc.job.getJob.useQuery(
    { page: 1, pageSize: 8 },
    { refetchOnWindowFocus: false },
  );
  const servicesQuery = trpc.service.getService.useQuery(
    { page: 1, pageSize: 8 },
    { refetchOnWindowFocus: false },
  );
  const tasksQuery = trpc.task.getTask.useQuery(
    { page: 1, pageSize: 8 },
    { refetchOnWindowFocus: false },
  );

  const heading = title || `${tNavbar("jobs")} · ${tNavbar("services")} · ${tNavbar("tasks")}`;

  const scrollBy = (ref: React.RefObject<HTMLDivElement | null>, direction: "prev" | "next") => {
    const delta = direction === "prev" ? -320 : 320;
    ref.current?.scrollBy({
      left: dir === "rtl" ? -delta : delta,
      behavior: "smooth",
    });
  };

  const getMobileItem = (items: any[], index: number) => {
    if (!items.length) return null;
    const normalized = ((index % items.length) + items.length) % items.length;
    return items[normalized] ?? null;
  };

  const jobsItems = jobsQuery.data?.items ?? [];
  const servicesItems = servicesQuery.data?.items ?? [];
  const tasksItems = tasksQuery.data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="hidden text-left md:block">
        <div className="text-base font-semibold text-slate-900">{heading}</div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{tNavbar("jobs")}</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 md:hidden">
              <button
                type="button"
                aria-label="Previous job card"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                onClick={() => setJobsIndex((prev) => prev - 1)}
              >
                <ChevronLeft className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
              </button>
              <button
                type="button"
                aria-label="Next job card"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                onClick={() => setJobsIndex((prev) => prev + 1)}
              >
                <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
              </button>
            </div>
            <Link
              href="/jobs"
              className="text-sm font-semibold text-slate-700 underline decoration-transparent underline-offset-4 transition hover:decoration-current"
            >
              {tHero("loadMore")}
            </Link>
          </div>
        </div>
        <div className="relative hidden md:block">
          <button
            type="button"
            aria-label="Scroll jobs left"
            className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm hover:bg-white"
            onClick={() => scrollBy(jobsScrollRef, "prev")}
          >
            <ChevronLeft className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
          <div
            ref={jobsScrollRef}
            className="flex w-full gap-4 overflow-x-auto overflow-y-hidden px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {(jobsQuery.data?.items ?? []).map((item: any) => (
              <div key={item.id} className="min-w-[280px] max-w-[280px] sm:min-w-[320px] sm:max-w-[320px]">
                <JobCard className="h-full" job={item} />
              </div>
            ))}
            {jobsQuery.isLoading ? (
              <div className="px-3 py-2 text-sm text-slate-500">{tHero("searching")}</div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Scroll jobs right"
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm hover:bg-white"
            onClick={() => scrollBy(jobsScrollRef, "next")}
          >
            <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
        </div>
        <div className="md:hidden">
          {jobsQuery.isLoading ? (
            <div className="px-1 py-2 text-sm text-slate-500">{tHero("searching")}</div>
          ) : getMobileItem(jobsItems, jobsIndex) ? (
            <JobCard className="h-full" job={getMobileItem(jobsItems, jobsIndex)} />
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{tNavbar("services")}</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 md:hidden">
              <button
                type="button"
                aria-label="Previous service card"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                onClick={() => setServicesIndex((prev) => prev - 1)}
              >
                <ChevronLeft className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
              </button>
              <button
                type="button"
                aria-label="Next service card"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                onClick={() => setServicesIndex((prev) => prev + 1)}
              >
                <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
              </button>
            </div>
            <Link
              href="/services"
              className="text-sm font-semibold text-slate-700 underline decoration-transparent underline-offset-4 transition hover:decoration-current"
            >
              {tHero("loadMore")}
            </Link>
          </div>
        </div>
        <div className="relative hidden md:block">
          <button
            type="button"
            aria-label="Scroll services left"
            className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm hover:bg-white"
            onClick={() => scrollBy(servicesScrollRef, "prev")}
          >
            <ChevronLeft className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
          <div
            ref={servicesScrollRef}
            className="flex w-full gap-4 overflow-x-auto overflow-y-hidden px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {(servicesQuery.data?.items ?? []).map((item: any) => (
              <div key={item.id} className="min-w-[260px] max-w-[260px] sm:min-w-[300px] sm:max-w-[300px]">
                <Link href={`/services?serviceCategory=${encodeURIComponent(item.serviceCategory ?? "")}`}>
                  <ServiceCard service={item} className="h-full" />
                </Link>
              </div>
            ))}
            {servicesQuery.isLoading ? (
              <div className="px-3 py-2 text-sm text-slate-500">{tHero("searching")}</div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Scroll services right"
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm hover:bg-white"
            onClick={() => scrollBy(servicesScrollRef, "next")}
          >
            <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
        </div>
        <div className="md:hidden">
          {servicesQuery.isLoading ? (
            <div className="px-1 py-2 text-sm text-slate-500">{tHero("searching")}</div>
          ) : getMobileItem(servicesItems, servicesIndex) ? (
            <Link
              href={`/services?serviceCategory=${encodeURIComponent(
                getMobileItem(servicesItems, servicesIndex)?.serviceCategory ?? "",
              )}`}
            >
              <ServiceCard service={getMobileItem(servicesItems, servicesIndex)} className="h-full" />
            </Link>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{tNavbar("tasks")}</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 md:hidden">
              <button
                type="button"
                aria-label="Previous task card"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                onClick={() => setTasksIndex((prev) => prev - 1)}
              >
                <ChevronLeft className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
              </button>
              <button
                type="button"
                aria-label="Next task card"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                onClick={() => setTasksIndex((prev) => prev + 1)}
              >
                <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
              </button>
            </div>
            <Link
              href="/tasks"
              className="text-sm font-semibold text-slate-700 underline decoration-transparent underline-offset-4 transition hover:decoration-current"
            >
              {tHero("loadMore")}
            </Link>
          </div>
        </div>
        <div className="relative hidden md:block">
          <button
            type="button"
            aria-label="Scroll tasks left"
            className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm hover:bg-white"
            onClick={() => scrollBy(tasksScrollRef, "prev")}
          >
            <ChevronLeft className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
          <div
            ref={tasksScrollRef}
            className="flex w-full gap-4 overflow-x-auto overflow-y-hidden px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {(tasksQuery.data?.items ?? []).map((item: any) => (
              <div key={item.id} className="min-w-[260px] max-w-[260px] sm:min-w-[300px] sm:max-w-[300px]">
                <TaskCard task={item} className="h-full" />
              </div>
            ))}
            {tasksQuery.isLoading ? (
              <div className="px-3 py-2 text-sm text-slate-500">{tHero("searching")}</div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Scroll tasks right"
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm hover:bg-white"
            onClick={() => scrollBy(tasksScrollRef, "next")}
          >
            <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
        </div>
        <div className="md:hidden">
          {tasksQuery.isLoading ? (
            <div className="px-1 py-2 text-sm text-slate-500">{tHero("searching")}</div>
          ) : getMobileItem(tasksItems, tasksIndex) ? (
            <TaskCard task={getMobileItem(tasksItems, tasksIndex)} className="h-full" />
          ) : null}
        </div>
      </section>
    </div>
  );
}
