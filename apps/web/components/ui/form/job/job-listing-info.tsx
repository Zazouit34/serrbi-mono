"use client"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslations } from "next-intl"
import { GraduationCapIcon, MapPinIcon } from "lucide-react"
import React from "react"

export function JobListingInfo({
  city,
  stateAbbreviation,
  experienceLevel,
  className,
  compact,
}: {
  city?: string | null
  stateAbbreviation?: string | null
  experienceLevel?: string | undefined
  className?: string
  compact?: boolean
}) {
  const t = useTranslations()
  const tAll = useTranslations()
  const translatedCity = city ? (tAll.has?.("Cities." + city) ? tAll("Cities." + city) : city) : undefined
  const locationLabel = translatedCity || ""

  return (
    <div
      className={cn(
        "flex items-center gap-6 text-sm",
        compact && "gap-4 text-xs pt-3",
        className,
      )}
    >
      {/* Location */}
      {locationLabel && (
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center justify-center rounded-md bg-gradient-to-tr from-pink-100 to-pink-200 p-1.5", compact && "p-1")}>
            <MapPinIcon className={cn("size-4 text-pink-600", compact && "size-3")} />
          </div>
          <span className={cn("font-medium text-foreground/80", compact && "text-xs")}>{locationLabel}</span>
        </div>
      )}

      {/* Experience */}
      {experienceLevel && (
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center justify-center rounded-md bg-gradient-to-tr from-indigo-100 to-indigo-200 p-1.5", compact && "p-1")}>
            <GraduationCapIcon className={cn("size-4 text-indigo-600", compact && "size-3")} />
          </div>
          <span className={cn("font-medium text-foreground/80", compact && "text-xs")}>
            {t(`Enums.ExperienceLevel.${experienceLevel}`)}
          </span>
        </div>
      )}
    </div>
  )
}
