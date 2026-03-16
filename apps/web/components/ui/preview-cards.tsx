"use client";

import { useRef } from "react";
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

const SCROLL_CLS =
  "flex gap-3 overflow-x-auto snap-x snap-mandatory py-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const CARD_CLS =
  "w-[72vw] min-w-[72vw] shrink-0 snap-start sm:w-[280px] sm:min-w-[280px]";

const JOB_CARD_CLS =
  "w-[72vw] min-w-[72vw] shrink-0 snap-start sm:w-[340px] sm:min-w-[340px]";

const ARROW_CLS =
  "absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm hover:bg-white h-7 w-7 md:h-8 md:w-8";

export function PreviewCards({ title }: PreviewCardsProps) {
  const jobsRef = useRef<HTMLDivElement | null>(null);
  const servicesRef = useRef<HTMLDivElement | null>(null);
  const tasksRef = useRef<HTMLDivElement | null>(null);
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

  const heading =
    title || `${tNavbar("jobs")} · ${tNavbar("services")} · ${tNavbar("tasks")}`;

  const scroll = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: "prev" | "next",
  ) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector("[data-card]") as HTMLElement | null;
    const delta = card ? card.offsetWidth + 12 : 300;
    el.scrollBy({
      left:
        dir === "rtl"
          ? direction === "prev"
            ? delta
            : -delta
          : direction === "prev"
            ? -delta
            : delta,
      behavior: "smooth",
    });
  };

  const chevronCls = dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="hidden text-left md:block">
        <div className="text-base font-semibold text-slate-900">{heading}</div>
      </div>

      {/* Jobs */}
      <section className="space-y-2">
        <div className="text-sm font-semibold text-slate-900">
          {tNavbar("jobs")}
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Scroll left"
            className={`${ARROW_CLS} left-1`}
            onClick={() => scroll(jobsRef, "prev")}
          >
            <ChevronLeft className={chevronCls} />
          </button>
          <div ref={jobsRef} className={SCROLL_CLS}>
            {(jobsQuery.data?.items ?? []).map((item: any) => (
              <div key={item.id} data-card className={JOB_CARD_CLS}>
                <JobCard className="h-full" job={item} />
              </div>
            ))}
            {jobsQuery.isLoading ? (
              <div className="shrink-0 px-3 py-2 text-sm text-slate-500">
                {tHero("searching")}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Scroll right"
            className={`${ARROW_CLS} right-1`}
            onClick={() => scroll(jobsRef, "next")}
          >
            <ChevronRight className={chevronCls} />
          </button>
        </div>
      </section>

      {/* Services */}
      <section className="space-y-2">
        <div className="text-sm font-semibold text-slate-900">
          {tNavbar("services")}
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Scroll left"
            className={`${ARROW_CLS} left-1`}
            onClick={() => scroll(servicesRef, "prev")}
          >
            <ChevronLeft className={chevronCls} />
          </button>
          <div ref={servicesRef} className={SCROLL_CLS}>
            {(servicesQuery.data?.items ?? []).map((item: any) => (
              <div key={item.id} data-card className={CARD_CLS}>
                <ServiceCard service={item} className="h-full" />
              </div>
            ))}
            {servicesQuery.isLoading ? (
              <div className="shrink-0 px-3 py-2 text-sm text-slate-500">
                {tHero("searching")}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Scroll right"
            className={`${ARROW_CLS} right-1`}
            onClick={() => scroll(servicesRef, "next")}
          >
            <ChevronRight className={chevronCls} />
          </button>
        </div>
      </section>

      {/* Tasks */}
      <section className="space-y-2">
        <div className="text-sm font-semibold text-slate-900">
          {tNavbar("tasks")}
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Scroll left"
            className={`${ARROW_CLS} left-1`}
            onClick={() => scroll(tasksRef, "prev")}
          >
            <ChevronLeft className={chevronCls} />
          </button>
          <div ref={tasksRef} className={SCROLL_CLS}>
            {(tasksQuery.data?.items ?? []).map((item: any) => (
              <div key={item.id} data-card className={CARD_CLS}>
                <TaskCard task={item} className="h-full" />
              </div>
            ))}
            {tasksQuery.isLoading ? (
              <div className="shrink-0 px-3 py-2 text-sm text-slate-500">
                {tHero("searching")}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Scroll right"
            className={`${ARROW_CLS} right-1`}
            onClick={() => scroll(tasksRef, "next")}
          >
            <ChevronRight className={chevronCls} />
          </button>
        </div>
      </section>
    </div>
  );
}
