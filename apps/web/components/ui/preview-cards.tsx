"use client";

import { useRef } from "react";
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

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="text-left">
        <div className="text-base font-semibold text-slate-900">{heading}</div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{tNavbar("jobs")}</div>
          <Link
            href="/jobs"
            className="text-sm font-semibold text-slate-700 underline decoration-transparent underline-offset-4 transition hover:decoration-current"
          >
            {tHero("loadMore")}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll jobs left"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
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
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            onClick={() => scrollBy(jobsScrollRef, "next")}
          >
            <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{tNavbar("services")}</div>
          <Link
            href="/services"
            className="text-sm font-semibold text-slate-700 underline decoration-transparent underline-offset-4 transition hover:decoration-current"
          >
            {tHero("loadMore")}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll services left"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
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
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            onClick={() => scrollBy(servicesScrollRef, "next")}
          >
            <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">{tNavbar("tasks")}</div>
          <Link
            href="/tasks"
            className="text-sm font-semibold text-slate-700 underline decoration-transparent underline-offset-4 transition hover:decoration-current"
          >
            {tHero("loadMore")}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll tasks left"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
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
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            onClick={() => scrollBy(tasksScrollRef, "next")}
          >
            <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
        </div>
      </section>
    </div>
  );
}
