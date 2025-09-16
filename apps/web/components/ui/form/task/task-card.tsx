"use client";

import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { CategoryBadge } from "@/components/ui/category-badge";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover";

type TaskCardProps = {
  task: {
    id: string;
    description: string;
    category: string;
    bgStyle?: string | null;
    budget?: number | null;
    budgetType?: string | null;
    city?: string | null;
    stateAbbreviation?: string | null;
    phoneNumber?: string | null;
    displayName?: string | null;
    user?: { name?: string | null; image?: string | null } | null;
  };
  className?: string;
};

const formatLocation = (city?: string | null, stateAbbreviation?: string | null) => {
  if (city && stateAbbreviation) return `${city}, ${stateAbbreviation}`;
  if (city) return city;
  if (stateAbbreviation) return stateAbbreviation;
  return "";
};

const formatBudget = (budget?: number | null) => { 
  return `${budget} MAD`;
};

export function TaskCard({ task, className }: TaskCardProps) {
  return (
    <div
      className={cn("overflow-hidden w-full bg-white rounded-3xl", className)}
    >
      {/* Gradient / description capsule */}
      <Link href={`/tasks/${task.id}`}>
        <div
          className="flex justify-center items-center w-full h-52 text-center rounded-3xl md:h-60" // ⬆️ increased height
          style={{
            background: task.bgStyle || "linear-gradient(to right, #ddd, #ccc)",
          }}
        >
          <span className="px-2 text-sm font-bold text-white md:text-base line-clamp-3">
            {task.description}
          </span>
        </div>
      </Link>

      {/* Info Section */}
      <div className="flex flex-col gap-2 px-4 py-3"> {/* ⬇️ reduced vertical gap */}
        {/* Name + Category */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium md:text-base">
            {task.displayName || task.user?.name || "Task Owner"}
          </span>
          <CategoryBadge category={task.category} type="task" />
        </div>

        {/* Location */}
        <div className="flex gap-1 items-center text-sm text-foreground/50 md:text-sm">
          <MapPin className="size-3" />
          <span>{formatLocation(task.city, task.stateAbbreviation)}</span>
        </div>

        {/* Budget + Contact (bottom row) */}
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold text-foreground">
            {formatBudget(task.budget)}
          </span>

          {task.phoneNumber && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Contact
                </Button>
              </PopoverTrigger>
              <PopoverContent className="flex flex-col gap-2 w-40">
                <button
                  onClick={() =>
                    window.open(`https://wa.me/${task.phoneNumber}`, "_blank")
                  }
                  className="flex items-center gap-2 text-sm text-white bg-[#25D366] px-2 py-1 rounded-md hover:bg-[#1ebe5d] transition"
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="size-4" />
                  WhatsApp
                </button>
                <button
                  onClick={() =>
                    (window.location.href = `tel:${task.phoneNumber}`)
                  }
                  className="flex gap-2 items-center px-2 py-1 text-sm rounded-md border transition hover:bg-gray-100"
                >
                  <Phone className="size-4" />
                  Call
                </button>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}
