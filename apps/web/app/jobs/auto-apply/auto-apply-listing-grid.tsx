"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/app/_trpc/client";
import { AutoApplyCard } from "@/components/ui/form/job/auto-apply-card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";

type JobCategory = import("@workspace/ui/lib/job-enum").JobCategoryValue;

type AutoApplyListingGridProps = {
  enabled: boolean;
  category: JobCategory | null;
  keywords: string[];
  roles: string[];
  strictMatch: boolean;
  smartOutreach: boolean;
  onOpenPrefs?: () => void;
};

type MatchReason = {
  code:
    | "resume-semantic"
    | "keyword-hit"
    | "role-hit"
    | "fresh-post"
    | "location-context"
    | "worktype-context";
  value?: string;
};

// ── Custom pagination button ─────────────────────────────────────────
function PageBtn({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-11 h-11 flex items-center justify-center rounded-2xl text-sm font-bold transition-all border
        ${
          active
            ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10"
            : disabled
              ? "text-slate-300 border-transparent cursor-not-allowed"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm"
        }`}
    >
      {children}
    </button>
  );
}

export function AutoApplyListingGrid({
  enabled,
  category,
  keywords,
  roles,
  strictMatch,
  smartOutreach,
  onOpenPrefs,
}: AutoApplyListingGridProps) {
  const [page, setPage] = useState(1);
  const tA = useTranslations("AutoApply");

  const filtersKey = useMemo(
    () => JSON.stringify({ enabled, category, keywords, roles, strictMatch, smartOutreach }),
    [enabled, category, keywords, roles, strictMatch, smartOutreach]
  );

  useEffect(() => {
    setPage(1);
  }, [filtersKey]);

  const queryInput = {
    page,
    pageSize: 3,
    enabled,
    category,
    keywords,
    roles,
    strictMatch,
    smartOutreach,
  };

  const { data, isLoading, isFetching, refetch } = trpc.job.getAutoApplyJobs.useQuery(queryInput, {
    enabled: enabled && !!category,
    placeholderData: (prev) => prev,
  });

  const applyMutation = trpc.job.applyForAutoJob.useMutation();
  const bulkApplyMutation = trpc.job.applyForAutoJobs.useMutation();

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const totalQueue = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 5;
  const rangeFrom = totalQueue === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, totalQueue);

  const formatTimeAgo = (createdAt?: Date | string | null): string => {
    if (!createdAt) return "";
    const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return tA("listing.time.justNow");
    if (diffMinutes < 60) return tA("listing.time.minutes", { count: diffMinutes });
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return tA("listing.time.hours", { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return tA("listing.time.days", { count: diffDays });
  };

  const buildReasonLabel = (job: any, reason: MatchReason): string | null => {
    switch (reason.code) {
      case "resume-semantic":
        return tA("listing.reasons.resume");
      case "keyword-hit":
        return reason.value ? tA("listing.reasons.keyword", { keyword: reason.value }) : null;
      case "role-hit":
        return reason.value ? tA("listing.reasons.role", { role: reason.value }) : null;
      case "fresh-post":
        return tA("listing.reasons.recency", { time: formatTimeAgo(job.createdAt) });
      case "location-context":
        return reason.value ? tA("listing.reasons.location", { location: reason.value }) : null;
      case "worktype-context":
        return reason.value ? tA("listing.reasons.type", { type: reason.value }) : null;
      default:
        return null;
    }
  };

  const buildConfidence = (matchPercent: number | null | undefined) => {
    const pct = typeof matchPercent === "number" ? matchPercent : 0;
    const level: "very-strong" | "strong" | "potential" =
      pct >= 80 ? "very-strong" : pct >= 60 ? "strong" : "potential";
    const label =
      level === "very-strong"
        ? tA("listing.matchLevels.veryStrong")
        : level === "strong"
          ? tA("listing.matchLevels.strong")
          : tA("listing.matchLevels.potential");
    return { level, label };
  };

  // ── Pagination pages array ──────────────────────────────────────────
  const pageNumbers = useMemo<(number | "...")[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  if (!enabled || !category) return null;

  return (
    <div className="flex flex-col flex-grow h-full space-y-0">
      {/* ── Section header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1 mb-8">
        <div>
          <h2 className="text-lg sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {tA("listing.curatedTitle")}
          </h2>
          <p className="text-xs sm:text-base text-slate-500 mt-1 sm:mt-1.5 font-medium opacity-80">
            {totalQueue > 0
              ? tA("listing.curatedSubtitle", { total: totalQueue })
              : tA("listing.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Preferences button — mobile only, next to bulk-apply */}
          {onOpenPrefs && (
            <button
              onClick={onOpenPrefs}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl active:scale-95 transition-transform shrink-0"
              style={{ backgroundColor: "#ff040E" }}
              aria-label="Preferences"
            >
              <SlidersHorizontal className="w-4 h-4 text-white" />
            </button>
          )}
          <Button
            size="sm"
            disabled={
              bulkApplyMutation.isPending ||
              !data?.items.some((j: any) => !j.alreadyApplied)
            }
            onClick={async () => {
              if (!data) return;
              const jobIds = data.items
                .filter((j: any) => !j.alreadyApplied)
                .map((j: any) => j.id);
              if (!jobIds.length) return;
              try {
                const res = await bulkApplyMutation.mutateAsync({ jobIds });
                const appliedCount = res.applied.length;
                const skippedCount = res.skipped.length;
                if (appliedCount) {
                  toast.success(
                    tA("listing.bulkAppliedSuccess", {
                      applied: appliedCount,
                      skipped: skippedCount,
                    })
                  );
                } else {
                  toast.info(tA("listing.bulkAppliedNone", { skipped: skippedCount }));
                }
                await refetch();
              } catch (err: any) {
                toast.error(err?.message || tA("listing.bulkAppliedError"));
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm border border-slate-900 active:scale-95 transition-all"
          >
            <Zap className="w-4 h-4" />
            {bulkApplyMutation.isPending ? tA("listing.bulkApplying") : tA("listing.applyPage")}
          </Button>
        </div>
      </div>

      {/* ── Job list ── */}
      <div className="flex-grow">
        {isLoading ? (
          <div className="flex flex-col gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 items-start p-6 rounded-[2rem] border border-slate-100 bg-slate-50/60"
              >
                <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="w-2/3 h-5" />
                  <Skeleton className="w-1/3 h-3.5" />
                  <Skeleton className="w-full h-3.5" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-14 text-sm text-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/60 text-slate-500">
            {tA("listing.noMatching")}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {data.items.map((job: any) => {
              const reasons = (Array.isArray(job.matchReasons) ? job.matchReasons : [])
                .map((reason: MatchReason) => buildReasonLabel(job, reason))
                .filter((r: string | null): r is string => Boolean(r))
                .slice(0, 3);
              const confidence = buildConfidence(job.matchPercent);
              return (
                <AutoApplyCard
                  key={job.id}
                  job={job}
                  alreadyApplied={job.alreadyApplied}
                  confidence={confidence}
                  reasons={reasons}
                  matchPercent={job.matchPercent}
                  postedAgo={formatTimeAgo(job.createdAt)}
                  onApply={async () => {
                    const res = await applyMutation.mutateAsync({ jobId: job.id });
                    return { message: res.message };
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-8 mt-auto px-1">
          {/* Left: range info */}
          <p className="text-sm font-bold text-slate-400">
            {tA("listing.pageRange", { from: rangeFrom, to: rangeTo, total: totalQueue })}
          </p>

          {/* Right: page buttons */}
          <div className="flex items-center gap-1.5">
            <PageBtn
              disabled={page <= 1}
              onClick={() => page > 1 && setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </PageBtn>

            {pageNumbers.map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-300 font-bold text-sm">
                  ...
                </span>
              ) : (
                <PageBtn
                  key={p}
                  active={page === p}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </PageBtn>
              )
            )}

            <PageBtn
              disabled={page >= totalPages}
              onClick={() => page < totalPages && setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </PageBtn>
          </div>
        </div>
      )}
    </div>
  );
}
