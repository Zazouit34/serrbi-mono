"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Sparkles, Info, Shield } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";

type JobCategory = import("@workspace/ui/lib/job-enum").JobCategoryValue;

type AutoApplyListingGridProps = {
  enabled: boolean;
  category: JobCategory | null;
  keywords: string[];
  roles: string[];
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
    pageSize: 10,
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

  const buildMatch = (job: any) => {
    const text = `${job.title ?? ""} ${job.description ?? ""}`.toLowerCase();
    const kwMatches = (keywords || []).filter((kw) => text.includes(kw.toLowerCase()));
    const roleMatches = (roles || []).filter((r) => text.includes(r.toLowerCase()));
    const recencyHours = job.createdAt ? (Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60) : 999;

    let score = 0;
    score += usedResumeEmbedding ? 2 : 0;
    score += Math.min(kwMatches.length, 2);
    score += Math.min(roleMatches.length, 2);
    if (recencyHours <= 72) score += 1;

    let level: "very-strong" | "strong" | "potential" = "potential";
    if (score >= 4) level = "very-strong";
    else if (score >= 2) level = "strong";

    const levelLabel =
      level === "very-strong"
        ? tA("listing.matchLevels.veryStrong")
        : level === "strong"
          ? tA("listing.matchLevels.strong")
          : tA("listing.matchLevels.potential");

    const reasons: string[] = [];
    if (usedResumeEmbedding) reasons.push(tA("listing.reasons.resume"));
    if (kwMatches.length) {
      const keyword = kwMatches[0] ?? "";
      reasons.push(tA("listing.reasons.keyword", { keyword }));
    }
    if (roleMatches.length) {
      const role = roleMatches[0] ?? "";
      reasons.push(tA("listing.reasons.role", { role }));
    }
    if (recencyHours <= 72) reasons.push(tA("listing.reasons.recency", { time: formatTimeAgo(job.createdAt) }));
    if (job.city) reasons.push(tA("listing.reasons.location", { location: job.city }));
    if (!job.city && job.type) reasons.push(tA("listing.reasons.type", { type: job.type }));

    return {
      level,
      levelLabel,
      reasons: reasons.slice(0, 4),
      postedAgo: formatTimeAgo(job.createdAt),
    };
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
    <Card className="rounded-3xl border border-slate-100 shadow-none bg-white">
      <CardHeader className="flex flex-row gap-3 justify-between items-center pb-2">
        <div className="flex gap-3 items-start">
          <div className="flex justify-center items-center w-10 h-10 bg-slate-900 text-white rounded-2xl shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold tracking-tight md:text-xl">
              {tA("listing.title")}
            </CardTitle>
            <p className="text-sm text-slate-500 max-w-xl">
              {tA("listing.subtitle")}
            </p>
            {usedResumeEmbedding && (
              <p className="text-[12px] text-emerald-700 flex items-center gap-1">
                <Shield className="h-4 w-4" />
                {tA("listing.resumeHint")}
              </p>
            )}
          </div>
        </div>

        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] px-3 py-1 rounded-full">
          {isFetching ? tA("listing.updating") : tA("listing.jobsInQueue", { count: totalQueue })}
        </Badge>
      </CardHeader>

      <CardContent className="pt-1 space-y-4">
        {data && data.items.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {tA("listing.bestMatches", {
                count: data.total,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isFetching || bulkApplyMutation.isPending}
                onClick={() => refetch()}
                className="h-7 px-3 text-[11px]"
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
                className="h-7 px-3 text-[11px]"
              >
                {bulkApplyMutation.isPending
                  ? tA("listing.bulkApplying")
                  : tA("listing.applyPage")}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <div className="py-8 text-sm text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-slate-500">
            {tA("listing.noMatching")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.items.map((job: any) => {
                const match = buildMatch(job);
                return (
                  <AutoApplyCard
                    key={job.id}
                    job={job}
                    alreadyApplied={job.alreadyApplied}
                    confidence={{ level: match.level, label: match.levelLabel }}
                    reasons={match.reasons}
                    postedAgo={match.postedAgo}
                    onApply={async () => {
                      const res = await applyMutation.mutateAsync({ jobId: job.id });
                      return { message: res.message };
                    }}
                  />
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination>
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
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}


