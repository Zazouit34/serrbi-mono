"use client";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { trpc } from "@/app/_trpc/client";
import { roleValues, type RoleValue } from "@workspace/ui/lib/role-enum";

type Row = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: RoleValue;
};

export const usersColumns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "phone", header: "Phone" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const utils = trpc.useUtils();
      const mut = trpc.auth.updateUserRole.useMutation({
        onSuccess: () => utils.auth.getUsers.invalidate(),
      });
      const current = row.original.role;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex gap-2 items-center"
              disabled={mut.isPending}
            >
              <span className="text-sm">{current}</span>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {roleValues.map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => {
                  if (role !== current) {
                    mut.mutate({ userId: row.original.id, role });
                  }
                }}
                className={role === current ? "bg-accent" : ""}
              >
                {role}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
