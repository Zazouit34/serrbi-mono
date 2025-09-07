"use client";

import Link from "next/link";
import { slugify } from "@/lib/slugify";
import { cn } from "@workspace/ui/lib/utils";
import { Card, CardContent, CardTitle } from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { CategoryBadge } from "@/components/ui/category-badge";
import { MapPin, Phone } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import {
  formatTaskStatus,
  getTaskStatusColor,
} from "@workspace/ui/lib/formatter";

type TaskCardProps = {
  task: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    budget?: number | null;
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

export function TaskCard({ task, className }: TaskCardProps) {
  const formatLocation = (
    city?: string | null,
    stateAbbreviation?: string | null
  ) => {
    if (city && stateAbbreviation) return `${city}, ${stateAbbreviation}`;
    if (city) return city;
    if (stateAbbreviation) return stateAbbreviation;
    return "Location not specified";
  };

  const formatBudget = (budget?: number | null) => {
    if (!budget)
      return (
        <span className="italic text-foreground/50 text-sm">
          Budget negotiable
        </span>
      );
    return (
      <div className="text-right">
        <div className="text-lg font-bold text-green-600">{budget} MAD</div>
      </div>
    );
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
    <Card
      className={cn(
        "relative group hover:shadow-lg transition-shadow",
        className
      )}
    >
      <CardContent className="space-y-2">
        {/* Category + Status */}
        <div className="flex justify-end gap-2">
          <CategoryBadge category={task.category as any} type="task" />
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-medium",
              getTaskStatusColor(task.status as any)
            )}
          >
            {formatTaskStatus(task.status as any)}
          </span>
        </div>

        {/* User */}
        <div className="flex gap-3 items-center">
          <Avatar className="rounded-md size-9">
            <AvatarImage
              src={task.displayImage || task.user?.image || ""}
              alt={task.displayName || task.user?.name || task.title}
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              {(task.displayName || task.user?.name || task.title)[0] || "T"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">
              {task.displayName || task.user?.name || "Task Owner"}
            </span>
            <span className="text-xs text-foreground/60">
              Posted {new Date(task.createdAt || "").toLocaleDateString()}
            </span>
          </div>
        </div>
        {/* Title */}
        <Link href={`/tasks/${slugify(task.title)}/${task.id}`}>
          <CardTitle className="text-lg font-bold hover:underline line-clamp-2">
            {task.title}
          </CardTitle>
        </Link>

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-primary mt-1">
          <MapPin className="size-3" />
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium">
            {formatLocation(task.city, task.stateAbbreviation)}
          </span>
        </div>

        {/* Contact buttons + Budget */}
        <div className="flex justify-between items-end pt-2">
          {task.phoneNumber ? (
            <div className="flex gap-2">
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
          ) : (
            <div></div>
          )}

          {formatBudget(task.budget)}
        </div>
      </CardContent>
    </Card>
  );
}
