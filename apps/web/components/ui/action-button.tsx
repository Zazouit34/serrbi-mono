"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { Briefcase, Search, StickyNote, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";

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
    };
  }, [t]);

  const promptSamples = useMemo(() => {
    return {
      jobs: asStringArray(t.raw("actionButtons.prompts.jobs")),
      services: asStringArray(t.raw("actionButtons.prompts.services")),
      tasks: asStringArray(t.raw("actionButtons.prompts.tasks")),
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

  return (
    <div ref={containerRef} className={cn("relative h-[170px] w-full", className)}>
      <div className="relative h-full">
        {/* Category buttons */}
        <div
          className={cn(
            "absolute inset-0 flex items-start justify-center pt-2 transition-opacity duration-300",
            activeCategory ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          <div className="flex flex-wrap justify-center gap-2 px-2">
            {actionCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-full",
                    "text-xs sm:text-sm px-3 sm:px-4",
                  )}
                  onClick={() => handleCategoryClick(category.key)}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{labels[category.key]}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Prompt samples */}
        <div
          className={cn(
            "absolute inset-0 py-1 space-y-1 overflow-y-auto transition-opacity duration-300",
            !activeCategory ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          {activeCategory &&
            promptSamples[activeCategory].map((prompt, index) => (
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
                <span className="line-clamp-1 text-slate-800">{prompt}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

