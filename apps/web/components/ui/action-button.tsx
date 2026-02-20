"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { Briefcase, FileText, Search, StickyNote, TrendingUp, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";

const FOCUS_OUT_DELAY_MS = 100;

type ActionKey = "jobs" | "services" | "tasks" | "resumeAnalyzer" | "careerSwitch";

const actionCategories: Array<{
  key: ActionKey;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "jobs", icon: Briefcase },
  { key: "services", icon: Wrench },
  { key: "tasks", icon: StickyNote },
  { key: "resumeAnalyzer", icon: FileText },
  { key: "careerSwitch", icon: TrendingUp },
];

export interface ActionButtonProps {
  onSelectPrompt: (prompt: string) => void;
  onCategoryClick?: (category: ActionKey) => void;
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  className?: string;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function ActionButton({
  onSelectPrompt,
  onCategoryClick,
  inputRef,
  className,
}: ActionButtonProps) {
  const t = useTranslations("HeroSearchBar");
  const [activeCategory, setActiveCategory] = useState<ActionKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const labels = useMemo(() => {
    return {
      jobs: t("actionButtons.categories.jobs"),
      services: t("actionButtons.categories.services"),
      tasks: t("actionButtons.categories.tasks"),
      resumeAnalyzer: t("actionButtons.categories.resumeAnalyzer"),
      careerSwitch: t("actionButtons.categories.careerSwitch"),
    };
  }, [t]);

  const promptSamples = useMemo(() => {
    return {
      jobs: asStringArray(t.raw("actionButtons.prompts.jobs")),
      services: asStringArray(t.raw("actionButtons.prompts.services")),
      tasks: asStringArray(t.raw("actionButtons.prompts.tasks")),
      resumeAnalyzer: asStringArray(t.raw("actionButtons.prompts.resumeAnalyzer")),
      careerSwitch: asStringArray(t.raw("actionButtons.prompts.careerSwitch")),
    } satisfies Record<ActionKey, string[]>;
  }, [t]);

  const handleCategoryClick = (category: ActionKey) => {
    setActiveCategory(category);
    onCategoryClick?.(category);
  };

  const handlePromptClick = (prompt: string) => {
    setActiveCategory(null);
    onSelectPrompt(prompt);
  };

  const resetToButtons = () => setActiveCategory(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeCategory) resetToButtons();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!activeCategory) return;
      if (!containerRef.current) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current.contains(target)) return;

      if (inputRef?.current && inputRef.current.contains(target)) return;
      resetToButtons();
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        if (!activeCategory) return;
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
  }, [activeCategory, inputRef]);

  const activeSamples = activeCategory ? promptSamples[activeCategory] : [];

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Category pill buttons (always visible) */}
      <div className="flex flex-wrap justify-center gap-2">
        {actionCategories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.key;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => handleCategoryClick(category.key)}
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

      {/* Prompt samples (dynamic height, no scroll) */}
      {activeSamples.length > 0 && (
        <div className="mt-2 space-y-1">
          {activeSamples.map((prompt, index) => (
            <button
              key={`${activeCategory}-${index}`}
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
          ))}
        </div>
      )}
    </div>
  );
}

