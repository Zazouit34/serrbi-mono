"use client";

import { useMemo, useRef } from "react";
import type React from "react";
import { Briefcase, ChevronLeft, ChevronRight, Search, StickyNote, Wrench } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";
import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { taskCategoryValues } from "@workspace/ui/lib/task-enum";
import { getCategoryPrompts } from "@/lib/smart-prompts";

type ActionKey = "jobs" | "services" | "tasks";

const actionCategories: Array<{
  key: ActionKey;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "jobs", icon: Briefcase },
  { key: "services", icon: Wrench },
  { key: "tasks", icon: StickyNote },
];

export interface ActionButtonProps {
  onSelectPrompt: (prompt: string) => void;
  onActionToggle: (action: ActionKey) => void;
  onCategoryToggle: (category: string) => void;
  selectedAction: ActionKey | null;
  selectedCategory?: string;
  className?: string;
}

export function ActionButton({
  onSelectPrompt,
  onActionToggle,
  onCategoryToggle,
  selectedAction,
  selectedCategory,
  className,
}: ActionButtonProps) {
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const t = useTranslations("HeroSearchBar");
  const tAll = useTranslations();
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);

  const labels = useMemo(() => {
    return {
      jobs: t("actionButtons.categories.jobs"),
      services: t("actionButtons.categories.services"),
      tasks: t("actionButtons.categories.tasks"),
    };
  }, [t]);

  const categories = useMemo(() => {
    if (!selectedAction) return [];
    if (selectedAction === "jobs") return jobCategoryValues.map((v) => String(v));
    if (selectedAction === "services") return serviceCategoryValues.map((v) => String(v));
    return taskCategoryValues.map((v) => String(v));
  }, [selectedAction]);

  const categoryIcons = useMemo(() => {
    const jobIcons = require("@/components/ui/config/job-filters-config").jobCategoryIcons ?? {};
    const serviceIcons = require("@/components/ui/config/service-filters-config").categoryIcons ?? {};
    const taskIcons = require("@/components/ui/config/task-filter-config").taskCategoryIcons ?? {};
    return {
      jobs: jobIcons,
      services: serviceIcons,
      tasks: taskIcons,
    } as const;
  }, []);

  const getTranslatedCategory = (action: ActionKey, category: string) => {
    if (action === "jobs") return tAll(`Enums.JobCategory.${category}`);
    if (action === "services") return tAll(`Enums.ServiceCategory.${category}`);
    return tAll(`Enums.TaskCategory.${category}`);
  };

  const activeSuggestions = useMemo(() => {
    if (!selectedAction || !selectedCategory) return [];
    return getCategoryPrompts(selectedAction, selectedCategory, locale);
  }, [selectedAction, selectedCategory, locale]);

  return (
    <div className={cn("relative w-full", className)}>
      {!selectedAction ? (
        <div className="flex flex-wrap justify-center gap-2">
          {actionCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => onActionToggle(category.key)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition whitespace-nowrap hover:bg-slate-50"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{labels[category.key]}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedAction ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll categories left"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            onClick={() =>
              categoryScrollRef.current?.scrollBy({
                left: dir === "rtl" ? 180 : -180,
                behavior: "smooth",
              })
            }
          >
            <ChevronLeft className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
          <div
            ref={categoryScrollRef}
            className="flex w-full gap-2 overflow-x-auto overflow-y-hidden px-1 py-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((category) => {
              const IconComponent =
                categoryIcons[selectedAction][category as keyof (typeof categoryIcons)[typeof selectedAction]];
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategoryToggle(category)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition",
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {IconComponent ? <IconComponent className="h-3.5 w-3.5" /> : null}
                  {getTranslatedCategory(selectedAction, category)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Scroll categories right"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            onClick={() =>
              categoryScrollRef.current?.scrollBy({
                left: dir === "rtl" ? -180 : 180,
                behavior: "smooth",
              })
            }
          >
            <ChevronRight className={dir === "rtl" ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
          </button>
        </div>
      ) : null}

      {selectedAction && selectedCategory ? (
        <div className="mt-2 space-y-1">
          {activeSuggestions.map((prompt, index) => (
            <button
              key={`${selectedAction}-${selectedCategory}-${index}`}
              type="button"
              className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
              onClick={() => onSelectPrompt(prompt)}
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-700" />
              <span className="text-slate-800">{prompt}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

