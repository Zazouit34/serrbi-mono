"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { Briefcase, Check, Search, StickyNote, Wrench } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";
import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { taskCategoryValues } from "@workspace/ui/lib/task-enum";

const FOCUS_OUT_DELAY_MS = 100;

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
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  className?: string;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function ActionButton({
  onSelectPrompt,
  onActionToggle,
  onCategoryToggle,
  selectedAction,
  selectedCategory,
  inputRef,
  className,
}: ActionButtonProps) {
  const locale = useLocale();
  const t = useTranslations("HeroSearchBar");
  const tAll = useTranslations();
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleActionClick = (category: ActionKey) => {
    onActionToggle(category);
  };

  const handlePromptClick = (prompt: string) => {
    onSelectPrompt(prompt);
  };

  const resetToButtons = () => {
    onCategoryToggle(selectedCategory ?? "");
  };

  useEffect(() => {
    if (!selectedAction || !selectedCategory) return;
    const cacheKey = `${selectedAction}:${selectedCategory}:${locale}`;
    if (suggestions[cacheKey]?.length) return;

    let cancelled = false;
    setIsLoadingSuggestions(true);
    void (async () => {
      try {
        const res = await fetch("/api/chat/category-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            intent: selectedAction,
            category: selectedCategory,
          }),
        });
        if (!res.ok) throw new Error(`Category suggestions failed (${res.status})`);
        const json = (await res.json()) as { suggestions?: string[] };
        const values = asStringArray(json?.suggestions).slice(0, 3);
        if (cancelled) return;
        setSuggestions((prev) => ({ ...prev, [cacheKey]: values }));
      } catch {
        if (cancelled) return;
        const fallback =
          selectedAction === "jobs"
            ? [
                `Find ${selectedCategory} jobs in Casablanca`,
                `Show remote ${selectedCategory} jobs with salary`,
                `Show recent ${selectedCategory} jobs this week`,
              ]
            : selectedAction === "services"
              ? [
                  `Find ${selectedCategory} services near me`,
                  `Show ${selectedCategory} services within my budget`,
                  `Show top rated ${selectedCategory} providers`,
                ]
              : [
                  `Show ${selectedCategory} tasks available today`,
                  `Find ${selectedCategory} tasks with higher budget`,
                  `Show urgent ${selectedCategory} tasks nearby`,
                ];
        setSuggestions((prev) => ({ ...prev, [cacheKey]: fallback }));
      } finally {
        if (!cancelled) setIsLoadingSuggestions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedAction, selectedCategory, locale, suggestions]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCategory) resetToButtons();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!selectedAction) return;
      if (!containerRef.current) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current.contains(target)) return;

      if (inputRef?.current && inputRef.current.contains(target)) return;
      resetToButtons();
    };

    const handleFocusOut = () => {
      setTimeout(() => {
      if (!selectedAction) return;
        const activeEl = document.activeElement;
        const isInsideContainer = !!(activeEl && containerRef.current?.contains(activeEl));
        const isInput = !!(activeEl && inputRef?.current && activeEl === inputRef.current);
        if (!isInsideContainer && !isInput) resetToButtons();
      }, FOCUS_OUT_DELAY_MS);
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [selectedAction, selectedCategory, inputRef]);

  const suggestionKey =
    selectedAction && selectedCategory ? `${selectedAction}:${selectedCategory}:${locale}` : "";
  const activeSuggestions = suggestionKey ? suggestions[suggestionKey] ?? [] : [];

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        {actionCategories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedAction === category.key;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => handleActionClick(category.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition whitespace-nowrap",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{labels[category.key]}</span>
            </button>
          );
        })}
      </div>

      {/* Categories for selected action */}
      {selectedAction && !selectedCategory && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {categories.map((category) => {
            const IconComponent =
              categoryIcons[selectedAction][category as keyof (typeof categoryIcons)[typeof selectedAction]];
            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryToggle(category)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                {IconComponent ? <IconComponent className="h-3.5 w-3.5" /> : null}
                {selectedAction === "jobs"
                  ? tAll(`Enums.JobCategory.${category}`)
                  : selectedAction === "services"
                    ? tAll(`Enums.ServiceCategory.${category}`)
                    : tAll(`Enums.TaskCategory.${category}`)}
              </button>
            );
          })}
        </div>
      )}

      {/* Suggestions for selected category */}
      {selectedAction && selectedCategory && (
        <div className="mt-2 space-y-1">
          {isLoadingSuggestions ? (
            <div className="px-3 py-2 text-sm text-slate-500">{t("thinking")}</div>
          ) : (
            activeSuggestions.slice(0, 3).map((prompt, index) => (
              <button
                key={`${selectedAction}-${selectedCategory}-${index}`}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm",
                  "hover:bg-slate-50 transition-colors",
                  "flex items-center gap-2 group",
                )}
                onClick={() => handlePromptClick(prompt)}
              >
                <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 group-hover:text-slate-700" />
                <span className="text-slate-800">{prompt}</span>
              </button>
            ))
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => onCategoryToggle(selectedCategory)}
          >
            <Check className="h-3 w-3" />
            Back
          </button>
        </div>
      )}
    </div>
  );
}

