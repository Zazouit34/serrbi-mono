"use client"
import { cn } from "@workspace/ui/lib/utils"
import { formatExperienceLevel } from "@workspace/ui/lib/formatter"
import { GraduationCapIcon, MapPinIcon } from "lucide-react"
import React from "react"

export function JobListingInfo({
  city,
  stateAbbreviation,
  experienceLevel,
  className,
}: {
  city?: string | null
  stateAbbreviation?: string | null
  experienceLevel?: string | undefined
  className?: string
}) {
  const locationLabel = [city, stateAbbreviation].filter(Boolean).join(", ")

  return (
    <div className={cn("flex items-center gap-6 text-sm", className)}>
      {/* Location */}
      {locationLabel && (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-md bg-gradient-to-tr from-pink-100 to-pink-200 p-1.5">
            <MapPinIcon className="size-4 text-pink-600" />
          </div>
          <span className="font-medium text-foreground/80">{locationLabel}</span>
        </div>
      )}

      {/* Experience */}
      {experienceLevel && (
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-md bg-gradient-to-tr from-indigo-100 to-indigo-200 p-1.5">
            <GraduationCapIcon className="size-4 text-indigo-600" />
          </div>
          <span className="font-medium text-foreground/80">
            {formatExperienceLevel(experienceLevel as any)}
          </span>
        </div>
      )}
    </div>
  )
}
