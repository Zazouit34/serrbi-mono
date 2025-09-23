"use client";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { trpc } from "@/app/_trpc/client";

type Row = {
  id: string;
  displayName?: string | null;
  category?: string;
  description: string;
  phoneNumber?: string | null;
};

export const tasksColumns: ColumnDef<Row>[] = [
  { accessorKey: "displayName", header: "Name" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "phoneNumber", header: "Phone" },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const utils = trpc.useUtils();
      const approve = trpc.task.approve.useMutation({
        onSuccess: () => utils.task.getPending.invalidate(),
      });
      const reject = trpc.task.reject.useMutation({
        onSuccess: () => utils.task.getPending.invalidate(),
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


