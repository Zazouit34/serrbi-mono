"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/app/_trpc/client";
import { AutoApplyCard } from "@/components/ui/form/job/auto-apply-card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@workspace/ui/components/pagination";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";

type JobCategory = import("@workspace/ui/lib/job-enum").JobCategoryValue;

type AutoApplyListingGridProps = {
  enabled: boolean;
  category: JobCategory | null;
  keywords: string[];
  roles: string[];
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

export function AutoApplyListingGrid({
  enabled,
  category,
  keywords,
  roles,
}: AutoApplyListingGridProps) {
  const [page, setPage] = useState(1);
  const tA = useTranslations("AutoApply");

  const filtersKey = useMemo(
    () => JSON.stringify({ enabled, category, keywords, roles }),
    [enabled, category, keywords, roles]
  );

  useEffect(() => {
    setPage(1);
  }, [filtersKey]);

  const queryInput = {
    page,
    pageSize: 5,
    enabled,
    category,
    keywords,
    roles,
  };

  const { data, isLoading, isFetching, refetch } = trpc.job.getAutoApplyJobs.useQuery(queryInput, {
    enabled: enabled && !!category,
    placeholderData: (prev) => prev,
  });

  const applyMutation = trpc.job.applyForAutoJob.useMutation();
  const bulkApplyMutation = trpc.job.applyForAutoJobs.useMutation();

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const totalQueue = data?.total ?? 0;
  const usedResumeEmbedding =
    data && "usedResumeEmbedding" in data ? (data as any).usedResumeEmbedding : false;

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

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    if (!totalPages) return null;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPage(i);
              }}
              isActive={page === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage(1);
            }}
            isActive={page === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (page > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      const middlePages = end - start + 1;
      const totalVisible = middlePages + 2;

      if (totalVisible < 3 && totalPages >= 3) {
        if (page <= 2) {
          end = Math.min(totalPages - 1, 2);
        } else if (page >= totalPages - 1) {
          start = Math.max(2, totalPages - 2);
        }
      }

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPage(i);
              }}
              isActive={page === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (page < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPage(totalPages);
              }}
              isActive={page === totalPages}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }

    return items;
  };

  if (!enabled || !category) {
    return null;
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header: title + subtitle + action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex gap-2 items-center">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {tA("listing.title")}
            </h2>
            {isFetching && (
              <span className="text-[11px] text-slate-400 font-medium animate-pulse">
                {tA("listing.updating")}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {tA("listing.subtitle")}
          </p>
          {usedResumeEmbedding && (
            <p className="text-[12px] text-emerald-700 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              {tA("listing.resumeHint")}
            </p>
          )}
          {data && data.items.length > 0 && (
            <p className="text-xs text-slate-400 pt-0.5">
              {tA("listing.bestMatches", { count: data.total })}
            </p>
          )}
        </div>

        {data && data.items.length > 0 && (
          <div className="flex gap-2 items-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching || bulkApplyMutation.isPending}
              onClick={() => refetch()}
              className="px-4 text-sm font-semibold rounded-xl"
            >
              {tA("listing.refresh")}
            </Button>
            <Button
              size="sm"
              disabled={bulkApplyMutation.isPending || !data.items.some((j: any) => !j.alreadyApplied)}
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
                      }),
                    );
                  } else {
                    toast.info(
                      tA("listing.bulkAppliedNone", {
                        skipped: skippedCount,
                      }),
                    );
                  }
                  await refetch();
                } catch (err: any) {
                  toast.error(
                    err?.message || tA("listing.bulkAppliedError"),
                  );
                }
              }}
              className="px-4 text-sm font-semibold text-white rounded-xl bg-slate-900 hover:bg-slate-800"
            >
              {bulkApplyMutation.isPending
                ? tA("listing.bulkApplying")
                : tA("listing.applyPage")}
            </Button>
          </div>
        )}
      </div>

      {/* Job list */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 justify-between items-start px-3 py-3 rounded-2xl border border-slate-100 bg-slate-50/70"
            >
              <div className="flex gap-3 items-start w-full">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-1/2 h-3" />
                  <Skeleton className="w-full h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="py-10 text-sm text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-slate-500">
          {tA("listing.noMatching")}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {data.items.map((job: any) => {
              const reasons = (Array.isArray(job.matchReasons) ? job.matchReasons : [])
                .map((reason: MatchReason) => buildReasonLabel(job, reason))
                .filter((reason: string | null): reason is string => Boolean(reason))
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

          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                {tA("listing.pageOf", { page, totalPages, total: totalQueue })}
              </p>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {renderPaginationItems()}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage(page + 1);
                      }}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}
