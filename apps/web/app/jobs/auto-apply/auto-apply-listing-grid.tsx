"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail } from "lucide-react";
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
    pageSize: 8,
    enabled,
    category,
    keywords,
    roles,
  };

  const { data, isLoading, isFetching } = trpc.job.getAutoApplyJobs.useQuery(queryInput, {
    enabled: enabled && !!category,
    placeholderData: (prev) => prev,
  });

  const applyMutation = trpc.job.applyForAutoJob.useMutation();

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const totalQueue = data?.total ?? 0;
  const usedResumeEmbedding =
    data && "usedResumeEmbedding" in data ? (data as any).usedResumeEmbedding : false;

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
    <Card className="rounded-2xl border border-slate-100 shadow-[0_16px_40px_rgba(15,23,42,0.08)] bg-white">
      <CardHeader className="flex flex-row gap-3 justify-between items-center pb-3">
        <div className="flex gap-3 items-center">
          <div className="flex justify-center items-center w-10 h-10 bg-violet-600 rounded-2xl">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight md:text-lg">
              {tA("listing.title")}
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              {tA("listing.subtitle")}
            </p>
            {usedResumeEmbedding && (
              <p className="mt-1 text-[11px] text-emerald-700">
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
              {data.items.map((job: any) => (
                <AutoApplyCard
                  key={job.id}
                  job={job}
                  alreadyApplied={job.alreadyApplied}
                  onApply={async () => {
                    const res = await applyMutation.mutateAsync({ jobId: job.id });
                    return { message: res.message };
                  }}
                />
              ))}
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


