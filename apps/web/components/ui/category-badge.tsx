// components/ui/CategoryBadge.tsx
"use client"

import { cn } from "@workspace/ui/lib/utils"
import { jobCategoryStyles, serviceCategoryStyles, taskCategoryStyles } from "@workspace/ui/lib/formatter"

type BadgeProps = {
  category: string
  type: "job" | "service" | "task"
}

export function CategoryBadge({ category, type }: BadgeProps) {
  const styles = type === "job" ? jobCategoryStyles[category as keyof typeof jobCategoryStyles] : type === "service" ? serviceCategoryStyles[category as keyof typeof serviceCategoryStyles] : taskCategoryStyles[category as keyof typeof taskCategoryStyles]

  if (!styles) return null

  const { label, color, icon: Icon } = styles

  if (type === "task") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-medium", color)}>
        <Icon className="size-3" />
        {label}
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium", color)}>
      <Icon className="size-3" />
      {label}
    </span>
  )
}
