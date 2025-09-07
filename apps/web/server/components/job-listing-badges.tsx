import { prisma } from "@workspace/db"
import { cn } from "@workspace/ui/lib/utils"
import {
  formatExperienceLevel,
  formatLocationRequirement,
  formatJobType,
  formatJobStatus,
  formatJobCategory,
} from "@workspace/ui/lib/formatter"
import {
  BanknoteIcon,
  BuildingIcon,
  GraduationCapIcon,
  HourglassIcon,
  MapPinIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
} from "lucide-react"
import React from "react"

export async function JobListingBadges({
  jobListingId,
  className,
  variant = "core",
}: {
  jobListingId: string
  className?: string
  variant?: "core" | "subtitle"
}) {
  const job = await prisma.job.findUnique({
    where: { id: jobListingId },
    select: {
      wage: true,
      stateAbbreviation: true,
      category: true,
      locationRequirement: true,
      experienceLevel: true,
      status: true,
      city: true,
      type: true,
      createdAt: true,
    },
  })

  if (!job) return null

  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-foreground/80">
      {children}
    </span>
  )

  const locationLabel = [job.city, job.stateAbbreviation].filter(Boolean).join(", ")
  const daysAgo = job.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : null

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {variant === "subtitle" ? (
        <>
          {job.category && (
            <Badge>
              <BriefcaseIcon className="size-3.5" />{formatJobCategory(job.category as any)}
            </Badge>
          )}
          {locationLabel && (
            <Badge>
              <MapPinIcon className="size-3.5" />{locationLabel}
            </Badge>
          )}
          {daysAgo !== null && (
            <Badge>
              <CalendarDaysIcon className="size-3.5" />
              {daysAgo === 0 ? "Today" : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`}
            </Badge>
          )}
          {job.status && (
            <Badge>
              <BuildingIcon className="size-3.5" />{formatJobStatus(job.status as any)}
            </Badge>
          )}
        </>
      ) : (
        <>
          {job.wage != null && (
            <Badge>
              <BanknoteIcon className="size-3.5" />${job.wage.toLocaleString()}
            </Badge>
          )}
          <Badge>
            <BuildingIcon className="size-3.5" />
            {formatLocationRequirement(job.locationRequirement as any)}
          </Badge>
          <Badge>
            <HourglassIcon className="size-3.5" />
            {formatJobType(job.type as any)}
          </Badge>
          <Badge>
            <GraduationCapIcon className="size-3.5" />
            {formatExperienceLevel(job.experienceLevel as any)}
          </Badge>
        </>
      )}
    </div>
  )
}