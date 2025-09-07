import { TaskListing } from "./task-listing/task-listing"
export const dynamic = "force-static"

export default function TasksPage() {
  return (
    <div>
    <h1 className="mb-8 text-4xl font-bold text-foreground">
    Professional Tasks
    </h1>
    <div className="grid gap-6">
      <div className="p-6 rounded-lg border bg-card">
        <h2 className="mb-4 text-2xl font-semibold">Available Tasks</h2>
      </div>
    <TaskListing />
    </div>
</div>
  )
} 