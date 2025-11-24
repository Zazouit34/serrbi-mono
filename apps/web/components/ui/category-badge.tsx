// components/ui/CategoryBadge.tsx
"use client"

import { cn } from "@workspace/ui/lib/utils"
import { jobCategoryStyles, serviceCategoryStyles, taskCategoryStyles } from "@workspace/ui/lib/formatter"
import { useTranslations } from "next-intl"

type BadgeProps = {
  category: string
  type: "job" | "service" | "task"
  className?: string
}

export function CategoryBadge({ category, type, className }: BadgeProps) {
  const t = useTranslations()
  const styles = type === "job" ? jobCategoryStyles[category as keyof typeof jobCategoryStyles] : type === "service" ? serviceCategoryStyles[category as keyof typeof serviceCategoryStyles] : taskCategoryStyles[category as keyof typeof taskCategoryStyles]

  if (!styles) return null

  const { color, icon: Icon } = styles
  const translatedLabel = type === "job"
    ? t(`Enums.JobCategory.${category}`)
    : type === "service"
    ? t(`Enums.ServiceCategory.${category}`)
    : t(`Enums.TaskCategory.${category}`)

  if (type === "task") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-medium", color, className)}>
        <Icon className="size-3" />
        {translatedLabel}
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium", color, className)}>
      <Icon className="size-3" />
      {translatedLabel}
    </span>
  )
}
