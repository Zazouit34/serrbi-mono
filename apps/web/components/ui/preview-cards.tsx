"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";

type PreviewType = "jobs" | "services" | "tasks";

interface PreviewCardsProps {
  title?: string;
  items: any[];
  type: PreviewType;
  isLoading?: boolean;
  isSearchMode?: boolean;
  onLoadMore?: () => void;
  loadMoreLabel?: string;
}

export function PreviewCards({
  title,
  items,
  type,
  isLoading,
  isSearchMode = false,
  onLoadMore,
  loadMoreLabel = "Load more",
}: PreviewCardsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [showCount, setShowCount] = useState(isSearchMode ? 6 : 12);
  const [isMdUp, setIsMdUp] = useState(false);

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
    const mq = window.matchMedia("(min-width: 768px)");
    const update = (event: MediaQueryListEvent | MediaQueryList) => setIsMdUp(event.matches);
    update(mq);
    const listener = (e: MediaQueryListEvent) => update(e);
    mq.addEventListener?.("change", listener);
    return () => {
      mq.removeEventListener?.("change", listener);
    };
  }, []);

  useEffect(() => {
    // Reset only when switching between search/default modes
    setShowCount(isSearchMode ? 6 : 12);
  }, [isSearchMode]);

  return (
    <div
      ref={containerRef}
      className={`space-y-6 transition-all duration-700 ease-out mx-auto max-w-4xl ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {title ? (
        <div className="mb-3 text-sm text-left font-medium text-gray-500">{title}</div>
      ) : null}
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
                  compact={isMdUp}
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
