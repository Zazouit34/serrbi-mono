"use client";

import { trpc } from "@/app/_trpc/client";

export default function AdminHome() {
  // Simple ping: fetch first page of pending jobs to verify wiring (safe even if empty)
  const { data, isLoading } = trpc.job.getJob.useQuery({ page: 1, pageSize: 1 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-sm text-muted-foreground">
        tRPC connected: {isLoading ? "loading..." : data ? "yes" : "no"}
      </p>
    </div>
  );
}


