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
      <div
        className={cn(
          "bg-white rounded-3xl shadow-lg p-6 mb-4 cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full",
          featured && "border-primary/50 bg-primary/5",
          className
        )}
      >
        {/* Container 1: Avatar + Category + Type */}
        <div className="flex justify-between items-start mb-2 md:mb-6">
          <Avatar className="size-16 rounded-2xl shadow-sm bg-gray-100">
            <AvatarImage
              src={job.companyImage ?? "https://imgs.search.brave.com/ZeYvSfT6KWIIw3qLEhIDlXkspf0psLFy9fHz0_S5GZY/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93d3cu/Y2l0eXBuZy5jb20v/cHVibGljL3VwbG9h/ZHMvcHJldmlldy9k/b3dubG9hZC1oZC1t/ZXRhLWZhY2Vib29r/LWxvZ28tcG5nLTcw/MTc1MTY5NDc3NzA2/N2hxcXdtM2Rvcmgu/cG5n"}
              alt={job.companyName ?? "Company"}
            />
            <AvatarFallback>
              {job.companyName?.slice(0, 1) ?? "C"}
            </AvatarFallback>
          </Avatar>
  
          <div className="flex flex-col gap-2 items-end">
            {job.category && (
              <CategoryBadge category={job.category} type="job" />
            )}
            <span className="px-2 py-0.5 rounded-md border text-foreground/70 text-xs">
              {formatJobType(job.type)}
            </span>
          </div>
        </div>
  
        {/* Container 2: Company + days ago */}
        <div className="mb-2 md:mb-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-800">
              {job.companyName ?? "Unknown Company"}
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-400">
              <ClockIcon className="size-3" />
              {daysAgo !== null
                ? daysAgo === 0
                  ? "Today"
                  : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`
                : ""}
            </span>
          </div>
        </div>
  
        {/* Container 3: Job title */}
        <div className="mb-2 md:mb-6 flex-1">
          <h2 className="text-2xl font-bold text-gray-900 leading-tight line-clamp-2">
            {job.title}
          </h2>
        </div>
  
        {/* Container 4: Location + Experience */}
        <div className="mb-2 md:mb-6">
          <JobListingInfo
            city={job.city}
            stateAbbreviation={job.stateAbbreviation}
            experienceLevel={job.experienceLevel}
          />
        </div>
  
        {/* Container 5: Wage + Apply button */}
        <div className="flex justify-between items-center mt-auto border-t pt-4">
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
      </div>
    )
  }
  