"use client";
import { trpc } from "@/app/_trpc/client";
import { TasksTable } from "@/components/tasks-table";
import { tasksColumns } from "@/components/tasks-columns";

export default function AdminTasksPage() {
  const { data, isLoading } = trpc.task.getPending.useQuery();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pending Tasks</h1>
      <TasksTable columns={tasksColumns} data={data ?? []} />
    </div>
  );
}
