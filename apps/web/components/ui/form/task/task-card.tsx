// components/ui/form/task/task-card.tsx

"use client";

import Link from "next/link";

import { useState } from "react";

import { MapPin, Phone } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { Card, CardContent } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { CategoryBadge } from "@/components/ui/category-badge";
import {
  formatTaskStatus,
  getTaskStatusColor,
  formatBudgetType,
  taskCategoryStyles,
} from "@workspace/ui/lib/formatter";

type TaskCardProps = {
  task: {
    id: string;
    title?: string | null; // Made optional since we're not using it
    description: string;
    category: string;
    bgStyle?: string | null;
    status: string;
    budget?: number | null;
    budgetType?: string | null;
    city?: string | null;
    stateAbbreviation?: string | null;
    deadline: Date | string;
    phoneNumber?: string | null;
    displayName?: string | null;
    displayImage?: string | null;
    images?: string[];
    user?: { name?: string | null; image?: string | null } | null;
    createdAt?: Date | string;
  };
  className?: string;
};

// 🔹 Time ago helper
function formatTimeAgo(date: Date | string) {
  if (!date) return "Some time ago";
  const now = new Date();
  const past = new Date(date);
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return past.toLocaleDateString();
}

export function TaskCard({ task, className }: TaskCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const formatLocation = (
    city?: string | null,
    stateAbbreviation?: string | null
  ) => {
    if (city && stateAbbreviation) return `${city}, ${stateAbbreviation}`;
    if (city) return city;
    if (stateAbbreviation) return stateAbbreviation;
    return "Location not specified";
  };

  const formatBudget = (budget?: number | null, budgetType?: string | null) => {
    if (!budget) return "Budget negotiable";
    const budgetText = `${budget} MAD`;
    return budgetType
      ? `${budgetText} (${formatBudgetType(budgetType as any)})`
      : budgetText;
  };

  const handleContact = (value: "whatsapp" | "phone") => {
    if (!task.phoneNumber) return;
    if (value === "whatsapp") {
      window.open(`https://wa.me/${task.phoneNumber}`, "_blank");
    } else {
      window.location.href = `tel:${task.phoneNumber}`;
    }
  };

  

  return (
    <div className="flex justify-center sm:block">
      <Card
        className={cn(
          "overflow-hidden w-full max-w-xs sm:max-w-none rounded-3xl shadow-md hover:shadow-lg transition-all !py-0",
          className
        )}
      >
        {/* Task description on top */}
        <div className="px-2 pt-2">
          <Link href={`/tasks/${task.id}`}>
            <div className="overflow-hidden relative w-full h-48 rounded-xl sm:h-64">
              <div
                style={{ background: task.bgStyle || "transparent", color: task.bgStyle ? "white" : "black" }}
                className="flex justify-center items-center w-full h-full text-center rounded-xl transition cursor-pointer hover:opacity-90"
              >
                <strong>{task.description}</strong>
              </div>
            </div>
          </Link>
        </div>

        <CardContent className="px-3 pb-4 space-y-3">
          {/* Header - User info + Status + Category */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-bold text-md md:text-lg">
                {task.displayName || task.user?.name || "Task Owner"}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(task.createdAt || "")}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  getTaskStatusColor(task.status as any)
                )}
              >
                {formatTaskStatus(task.status as any)}
              </span>
              <CategoryBadge category={task.category} type="task" />
            </div>
          </div>

          {/* Location + Budget */}
          <div className="flex justify-between items-start text-sm text-gray-700">
            <div className="flex flex-col">
              {/* Location */}
              <div className="flex gap-1 items-center text-xs font-semibold text-foreground/80 md:text-sm">
                <MapPin className="size-4" />
                <span>{formatLocation(task.city, task.stateAbbreviation)}</span>
              </div>
            </div>

            {/* Budget on the right */}
            <div className="text-xs font-semibold md:text-base text-foreground">
              {formatBudget(task.budget, task.budgetType)}
            </div>
          </div>

          {/* Footer - WhatsApp left / Call right */}
          {task.phoneNumber && (
            <div className="flex justify-between items-center pt-3 border-t">
              <button
                onClick={() => handleContact("whatsapp")}
                className="flex items-center gap-1 rounded-md bg-[#25D366] px-3 py-1 text-white text-sm hover:bg-[#1ebe5d] transition"
              >
                <FontAwesomeIcon icon={faWhatsapp} className="size-4" />
                WhatsApp
              </button>
              <button
                onClick={() => handleContact("phone")}
                className="flex gap-1 items-center px-3 py-1 text-sm rounded-md border transition hover:bg-muted"
              >
                <Phone className="size-3" />
                Call
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
