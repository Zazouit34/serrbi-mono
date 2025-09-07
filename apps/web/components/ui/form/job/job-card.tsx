"use client";
import Link from "next/link";
import { slugify } from "@/lib/slugify";
import { ArrowRight, ClockIcon, BanknoteIcon} from "lucide-react";
import { Card, CardTitle, CardContent } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { JobListingInfo } from "./job-listing-info";
import { Button } from "@workspace/ui/components/button";
import { CategoryBadge } from "@/components/ui/category-badge";
import { formatJobType } from "@workspace/ui/lib/formatter";
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
  const daysAgo = job.createdAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(job.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const locationLabel = [job.city, job.stateAbbreviation]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      className={cn(
        "overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow",
        featured && "border-primary/50 bg-primary/5",
        className
      )}
    >
      <CardContent className="space-y-2">
        {/* Category + Type badges */}
        <div className="flex justify-end gap-2">
          {job.category && (
            <CategoryBadge category={job.category} type="job" />
          )}
          <span className="px-2 py-0.5 rounded-md border text-foreground/70 text-xs">
            {formatJobType(job.type as any)}
          </span>
        </div>

        {/* Title */}
        <CardTitle className="text-lg font-semibold leading-tight line-clamp-2">
          {job.title}
        </CardTitle>

        {/* Company + avatar + time */}
        <div className="flex items-center gap-3">
          <Avatar className="size-9 rounded-md">
            <AvatarImage
              src={job.user?.image ?? ""}
              alt={job.user?.name ?? "Company"}
            />
            <AvatarFallback>{job.user?.name?.[0] ?? "C"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {job.companyName ?? "Unknown Company"}
            </span>
            <span className="flex items-center gap-1 text-xs text-foreground/60">
              <ClockIcon className="size-3" />
              {daysAgo !== null
                ? daysAgo === 0
                  ? "Today"
                  : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`
                : ""}
            </span>
          </div>
        </div>

        {/* Location + experience */}
        <div className="space-y-2">
          <JobListingInfo
            city={job.city}
            stateAbbreviation={job.stateAbbreviation}
            experienceLevel={job.experienceLevel}
          />
        </div>

        {/* Footer with Apply + Wage */}
        <div className="flex justify-between items-center border-t pt-3 mt-2">
          {job.wage != null && (
            <div className="flex items-baseline gap-2">
              <BanknoteIcon className="size-4 text-primary/80" />
              <span className="text-base font-semibold text-foreground">
                {job.wage.toLocaleString()} MAD
              </span>
              <span className="text-xs text-foreground/50">/month</span>
            </div>
          )}

          <Link href={`/jobs/apply/${slugify(job.title)}/${job.id}`}>
            <Button variant="outline" size="sm">
              Apply Now
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
