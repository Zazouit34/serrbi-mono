"use client";
import { trpc } from "@/app/_trpc/client";
import { UsersTable } from "@/components/users-table";
import { usersColumns } from "@/components/users-columns";

export default function AdminUsersPage() {
  const { data, isLoading } = trpc.auth.getUsers.useQuery();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>
      <UsersTable columns={usersColumns} data={data ?? []} />
    </div>
  );
}


