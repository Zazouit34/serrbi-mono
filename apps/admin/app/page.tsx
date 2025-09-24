"use client";

import { trpc } from "@/app/_trpc/client";

export default function AdminHome() {
  const { data: ping, isLoading: pingLoading } =
    trpc.job.getJob.useQuery({ page: 1, pageSize: 1 }); // reachability only

  const { data: who, error: whoErr, isLoading: whoLoading } =
    trpc.auth.whoAmI.useQuery(); // admin-only you added

  return (
    <div className="space-y-2">
      <div>tRPC connected: {pingLoading ? "loading..." : ping ? "yes" : "no"}</div>
      <div>
        Admin session: {whoLoading ? "checking..." : who ? `yes (${who.id})` : whoErr ? "no" : "no"}
      </div>
    </div>
  );
}


