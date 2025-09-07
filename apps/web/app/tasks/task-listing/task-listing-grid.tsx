"use client"

import { trpc } from "@/app/_trpc/client"
import { TaskCard } from "@/components/ui/form/task/task-card"
import { Skeleton } from "@workspace/ui/components/skeleton"

type TaskListingGridProps = {
  filters: Record<string, string>
}

export function TaskListingGrid({ filters }: TaskListingGridProps) {
  const queryInput = {
    ...filters,
    page: 1,
    pageSize: 10,
  }

  const { data, isLoading } = trpc.task.getTask.useQuery(queryInput)
  const task = data?.items ?? []

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border">
            <Skeleton className="w-3/4 h-6" />
            <Skeleton className="mt-2 w-16 h-5" />
            <Skeleton className="mt-4 w-24 h-4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {task.length === 0 ? (
        <p>No tasks found</p>
      ) : (
        task.map((t: any) => <TaskCard key={t.id} task={t} />)
      )}
    </div>
  )
}
