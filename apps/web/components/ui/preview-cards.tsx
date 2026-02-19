"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { taskCategoryValues } from "@workspace/ui/lib/task-enum";

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

const jobCategoryIcons = require("@/components/ui/config/job-filters-config").jobCategoryIcons ?? {};
const serviceCategoryIcons =
  require("@/components/ui/config/service-filters-config").categoryIcons ?? {};
const taskCategoryIcons = require("@/components/ui/config/task-filter-config").taskCategoryIcons ?? {};

export function PreviewCards({
  title,
  items,
  type,
  isLoading,
  isSearchMode = false,
  selectedCategory,
  onTypeChange,
  onCategoryChange,
  onLoadMore,
  loadMoreLabel = "Load more",
}: PreviewCardsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [showCount, setShowCount] = useState(isSearchMode ? 6 : 12);
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const tNavbar = useTranslations("Navbar");
  const tAll = useTranslations();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Reset when switching between search/default modes or between preview types
    setShowCount(isSearchMode ? 6 : 12);
  }, [isSearchMode, type]);

  const heading = useMemo(() => {
    if (type === "jobs") return tNavbar("jobs");
    if (type === "services") return tNavbar("services");
    return tNavbar("tasks");
  }, [tNavbar, type]);

  const tabLabels = useMemo(
    () => ({
      jobs: tNavbar("jobs"),
      services: tNavbar("services"),
      tasks: tNavbar("tasks"),
    }),
    [tNavbar],
  );

  const categories = useMemo(() => {
    if (type === "jobs") {
      return {
        options: jobCategoryValues,
        icons: jobCategoryIcons,
        labelKeyPrefix: "Enums.JobCategory.",
      } as const;
    }
    if (type === "services") {
      return {
        options: serviceCategoryValues,
        icons: serviceCategoryIcons,
        labelKeyPrefix: "Enums.ServiceCategory.",
      } as const;
    }
    return {
      options: taskCategoryValues,
      icons: taskCategoryIcons,
      labelKeyPrefix: "Enums.TaskCategory.",
    } as const;
  }, [type]);

  return (
    <div
      ref={containerRef}
      className={`space-y-6 transition-all duration-700 ease-out mx-auto max-w-4xl ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-left">
            <div className="text-base font-semibold text-slate-900">{heading}</div>
            {title ? <div className="text-sm text-slate-500">{title}</div> : null}
          </div>

          {onTypeChange ? (
            <div className="flex justify-start sm:justify-end">
              <Select value={type} onValueChange={(v) => onTypeChange(v as PreviewType)}>
                <SelectTrigger className="h-9 min-w-[160px] px-3 text-sm">
                  <SelectValue placeholder={tabLabels[type]} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jobs">{tabLabels.jobs}</SelectItem>
                  <SelectItem value="services">{tabLabels.services}</SelectItem>
                  <SelectItem value="tasks">{tabLabels.tasks}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        {onCategoryChange ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Scroll categories left"
              className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              onClick={() =>
                categoryScrollRef.current?.scrollBy({
                  left: dir === "rtl" ? 180 : -180,
                  behavior: "smooth",
                })
              }
            >
              <ChevronLeft className={dir === "rtl" ? "w-4 h-4 rotate-180" : "w-4 h-4"} />
            </button>
            <div
              ref={categoryScrollRef}
              className="flex overflow-x-auto overflow-y-hidden no-scrollbar gap-2 py-1 px-1 w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {categories.options.map((option) => {
                const IconComponent = categories.icons[option as keyof typeof categories.icons];
                const isSelected = selectedCategory === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onCategoryChange(isSelected ? undefined : String(option))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition whitespace-nowrap ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {IconComponent ? <IconComponent className="w-3.5 h-3.5" /> : null}
                    {tAll((categories.labelKeyPrefix + option) as any)}
                    {isSelected ? <Check className="w-3 h-3" /> : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Scroll categories right"
              className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              onClick={() =>
                categoryScrollRef.current?.scrollBy({
                  left: dir === "rtl" ? -180 : 180,
                  behavior: "smooth",
                })
              }
            >
              <ChevronRight className={dir === "rtl" ? "w-4 h-4 rotate-180" : "w-4 h-4"} />
            </button>
          </div>
        ) : null}
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-gray-500">No items to show yet.</p>
      )}
      {!isLoading && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 text-left">
            {items.slice(0, showCount).map((item: any) => {
            if (type === "jobs") {
              return (
                <JobCard
                  key={item.id}
                  className="h-full"
                  job={item}
                  compact
                />
              );
            }
            if (type === "services") {
              return (
                <Link
                  key={item.id}
                  href={`/services?serviceCategory=${encodeURIComponent(item.serviceCategory ?? "")}`}
                >
                  <ServiceCard service={item} className="h-full" />
                </Link>
              );
            }
            return (
              <TaskCard key={item.id} task={item} className="h-full" />
            );
            })}
          </div>
          {!isSearchMode && onLoadMore && items.length >= showCount && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCount((prev) => prev + 12);
                  onLoadMore?.();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                {loadMoreLabel}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
