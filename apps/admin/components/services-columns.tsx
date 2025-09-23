"use client";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { trpc } from "@/app/_trpc/client";

type Row = {
  id: string;
  title: string;
  displayName?: string | null;
  serviceCategory: string;
  city?: string | null;
  stateAbbreviation?: string | null;
  price: number;
  phoneNumber?: string | null;
  email?: string | null;
};

export const servicesColumns: ColumnDef<Row>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "displayName", header: "Owner" },
  { accessorKey: "serviceCategory", header: "Category" },
  { accessorKey: "city", header: "City" },
  { accessorKey: "stateAbbreviation", header: "State" },
  { accessorKey: "price", header: "Price" },
  { accessorKey: "phoneNumber", header: "Phone" },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const utils = trpc.useUtils();
      const approve = trpc.service.approve.useMutation({
        onSuccess: () => utils.service.getPending.invalidate(),
      });
      const reject = trpc.service.reject.useMutation({
        onSuccess: () => utils.service.getPending.invalidate(),
      });

      return (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => approve.mutate({ id: row.original.id })} disabled={approve.isPending}>
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const reason = prompt("Reject reason") || "";
              if (reason) reject.mutate({ id: row.original.id, reason });
            }}
            disabled={reject.isPending}
          >
            Reject
          </Button>
        </div>
      );
    },
  },
];


