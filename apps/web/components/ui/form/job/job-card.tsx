"use client";

import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { ArrowRight, ClockIcon } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { JobListingInfo } from "./job-listing-info";
import { Button } from "@workspace/ui/components/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { useTranslations } from "next-intl";
import { FavoriteButton } from "@/components/ui/favorite-button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";

export function JobCard({
  job,
  featured,
  className,
  compact,
}: {
  job: {
    id: string;
    title: string;
    companyName: string | null;
    companyImage: string | null;
    wage: number | null;
    stateAbbreviation: string | null;
    city: string | null;
    type: any;
    experienceLevel: any;
    locationRequirement: any;
    category?: any;
    user?: { name?: string | null; image?: string | null } | null;
    createdAt?: Date | string;
    description?: string;
    status?: any;
  };
  featured?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("JobCard");
  const tAll = useTranslations();
  const router = useRouter();
  const daysAgo = job.createdAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(job.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const href = `/jobs/apply/${slugify(job.title)}/${job.id}`;
  const wageMin = typeof job.wage === "number" ? job.wage : null;
  const wageMax = wageMin != null ? wageMin + 200 : null;

  return (
    <div className={cn(compact ? "block" : "flex justify-center sm:block")}>
      <Card
        className={cn(
          "overflow-hidden w-full sm:max-w-none rounded-3xl shadow-md hover:shadow-lg transition-all !py-0 cursor-pointer",
          compact && "rounded-2xl shadow-sm hover:shadow-md !py-0",
          featured && "border-primary/50 bg-primary/5",
          className,
        )}
        role="link"
        tabIndex={0}
        onClick={() => router.push(href)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(href);
          }
        }}
      >
        <CardContent
          className={cn(
            "p-4 space-y-6 md:p-6",
            compact && "p-2 md:p-3 space-y-2 flex flex-col",
          )}
        >
          {/* Top Row: Avatar + Category + Type */}
          <div className="flex justify-between items-start">
            <Avatar
              className={cn(
                "bg-gray-100 rounded-2xl shadow-sm size-12 sm:size-16",
                compact && "size-8 rounded-xl shadow"
              )}
            >
              <AvatarImage
                src={job.companyImage || undefined}
                alt={job.companyName ?? "Company"}
              />
              <AvatarFallback
                className={cn(
                  "bg-gray-200 text-gray-600 font-semibold",
                  compact && "text-[10px]"
                )}
              >
                {job.companyName?.slice(0, 2).toUpperCase() ?? "CO"}
              </AvatarFallback>
            </Avatar>

            <div
              className={cn(
                "flex flex-col gap-2 items-end",
                compact && "gap-1"
              )}
            >
              {job.category && (
                <CategoryBadge
                  category={job.category}
                  type="job"
                  className={cn(compact && "text-[10px] px-1.5 py-0.5")}
                />
              )}
              <span
                className={cn(
                  "px-2 py-0.5 rounded-md border text-foreground/70 text-xs md:text-sm",
                  compact && "text-[10px] px-1.5 py-0.5"
                )}
              >
                {tAll(`Enums.LocationRequirement.${job.locationRequirement}`)}
              </span>
            </div>
          </div>

          {/* Company + Days ago + Favorite */}
          <div
            className={cn(
              "flex justify-between items-center min-h-[1.5rem] md:min-h-[2rem]",
              compact && "min-h-[1.25rem]"
            )}
          >
            <div className="flex flex-1 gap-2 items-center min-w-0">
              <span
                className={cn(
                  "text-sm font-semibold text-gray-800 md:text-lg truncate",
                  compact && "text-xs md:text-sm"
                )}
              >
                {job.companyName ?? t("unknownCompany")}
              </span>
              <span
                className={cn(
                  "flex gap-1 items-center text-xs text-gray-400 md:text-sm whitespace-nowrap",
                  compact && "text-[10px]"
                )}
              >
                <ClockIcon className={cn("size-3", compact && "size-2.5")} />
                {daysAgo !== null
                  ? daysAgo === 0
                    ? t("today")
                    : t(
                        daysAgo === 1 ? "daysAgo_one" : "daysAgo_other",
                        { count: daysAgo }
                      )
                  : ""}
              </span>
            </div>
            {!compact && (
              <div
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <FavoriteButton
                  jobId={job.id}
                  color={[239, 68, 68]}
                />
              </div>
            )}
          </div>

          {/* Job Title */}
          <div
            className={cn(
              "min-h-[2.5rem] md:min-h-[3.75rem]",
              compact && "min-h-[1.75rem]"
            )}
          >
            <h2
              className={cn(
                "text-base font-bold leading-tight text-gray-900 md:text-2xl line-clamp-2",
                compact && "text-left text-sm md:text-base line-clamp-2"
              )}
            >
              {job.title}
            </h2>
          </div>

          {/* Location + Experience */}
          <div className={cn(compact && "mt-auto")}>
            <JobListingInfo
              city={job.city}
              stateAbbreviation={job.stateAbbreviation}
              experienceLevel={job.experienceLevel}
              compact={compact}
            />
          </div>

          {/* Wage + Apply button (hidden in compact mode) */}
          {!compact && (
            <div className="flex justify-between items-center pt-3 border-t">
              {wageMin != null && wageMax != null && (
                <div className="flex gap-1 items-baseline md:gap-2">
                  <span className="text-sm font-semibold text-emerald-600 md:text-base">
                    {wageMin.toLocaleString()} - {wageMax.toLocaleString()}{" "}
                    {tAll("Currency.MAD")}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(href);
                }}
              >
                {t("apply")}
                <ArrowRight className="ml-1 md:ml-2 size-3 md:size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
