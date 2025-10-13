"use client";

import Link from "next/link";
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
}) {
  const t = useTranslations("JobCard");
  const tAll = useTranslations();
  const daysAgo = job.createdAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(job.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <div className="flex justify-center sm:block">
      <Card
        className={cn(
          "overflow-hidden w-full sm:max-w-none rounded-3xl shadow-md hover:shadow-lg transition-all !py-0",
          featured && "border-primary/50 bg-primary/5",
          className
        )}
      >
        <CardContent className="p-4 space-y-6 md:p-6">
          {/* Top Row: Avatar + Category + Type */}
          <div className="flex justify-between items-start">
            <Avatar className="bg-gray-100 rounded-2xl shadow-sm size-12 sm:size-16">
              <AvatarImage
                src={job.companyImage || undefined}
                alt={job.companyName ?? "Company"}
              />
              <AvatarFallback className="bg-gray-200 text-gray-600 font-semibold">
                {job.companyName?.slice(0, 2).toUpperCase() ?? "CO"}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-2 items-end">
              {job.category && (
                <CategoryBadge category={job.category} type="job" />
              )}
              <span className="px-2 py-0.5 rounded-md border text-foreground/70 text-xs md:text-sm">
                {tAll(`Enums.LocationRequirement.${job.locationRequirement}`)}
              </span>
            </div>
          </div>

          {/* Company + Days ago + Favorite */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-semibold text-gray-800 md:text-lg">
                {job.companyName ?? t("unknownCompany")}
              </span>
              <span className="flex gap-1 items-center text-xs text-gray-400 md:text-sm">
                <ClockIcon className="size-3" />
                {daysAgo !== null
                  ? daysAgo === 0
                    ? t("today")
                    : t(daysAgo === 1 ? "daysAgo_one" : "daysAgo_other", { count: daysAgo })
                  : ""}
              </span>
            </div>
            <FavoriteButton jobId={job.id} color={[239, 68, 68]} />
          </div>

          {/* Job Title */}
          <h2 className="text-base font-bold leading-tight text-gray-900 md:text-2xl line-clamp-2">
            {job.title}
          </h2>

          {/* Location + Experience */}
          <JobListingInfo
            city={job.city}
            stateAbbreviation={job.stateAbbreviation}
            experienceLevel={job.experienceLevel}
          />

          {/* Wage + Apply button */}
          <div className="flex justify-between items-center pt-3 border-t">
            {job.wage != null && (
              <div className="flex gap-1 items-baseline md:gap-2">
                <span className="text-sm font-semibold md:text-base text-foreground">
                  {job.wage.toLocaleString()} {tAll("Currency.MAD")}
                </span>
                <span className="text-xs text-foreground/50">{t("perMonth")}</span>
              </div>
            )}

            <Link href={`/jobs/apply/${slugify(job.title)}/${job.id}`}>
              <Button variant="outline" size="sm">
                {t("apply")}
                <ArrowRight className="ml-1 md:ml-2 size-3 md:size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
