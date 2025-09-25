"use client";
import { trpc } from "@/app/_trpc/client";
import { ServicesTable } from "@/components/services-table";
import { servicesColumns } from "@/components/services-columns";

export default function AdminServicesPage() {
  const { data, isLoading } = trpc.service.getPending.useQuery();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pending Services</h1>
      <ServicesTable columns={servicesColumns} data={data ?? []} />
    </div>
  );
}
