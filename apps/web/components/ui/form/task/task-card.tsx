"use client";

import Link from "next/link";
import { Phone, MessageCircleMore } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { useTranslations } from "next-intl";

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
    city?: string | null;
    stateAbbreviation?: string | null;
    phoneNumber?: string | null;
    displayName?: string | null;
    user?: { name?: string | null; image?: string | null } | null;
  };
  className?: string;
};

const formatLocation = (t: ReturnType<typeof useTranslations>, city?: string | null) => {
  const tCity = city ? (t.has?.("Cities." + city) ? t("Cities." + city) : city) : undefined;
  return tCity || "";
};

const formatBudget = (budget?: number | null, t?: ReturnType<typeof useTranslations>) => { 
  if (!t) return `${budget} MAD`;
  return `${t("Common.from")} ${budget ?? ""} ${t("Currency.MAD")}`;
};

export function TaskCard({ task, className }: TaskCardProps) {
  const t = useTranslations();
  return (
    <div className={cn("w-full cursor-pointer", className)}>
      {/* Description Section (replacing image carousel) */}
      <div className="overflow-hidden relative w-full rounded-xl shadow-md aspect-square">
        <div
          className="flex justify-center items-center w-full h-full text-center"
          style={{
            background: task.bgStyle || "linear-gradient(to right, #ddd, #ccc)",
          }}
        >
          <span className="px-4 text-xl font-bold text-white line-clamp-4">
            {task.description}
          </span>
        </div>

        {/* Category badge - top right */}
        <div className="absolute top-2 right-2">
          <div className="px-3 py-1 text-xs font-medium text-gray-800 bg-white rounded-full shadow-sm">
            {task.category}
          </div>
        </div>

        {/* Glass Overlay */}
        <div className="flex absolute right-0 bottom-0 left-0 flex-col px-3 py-2 rounded-t-md rounded-b-xl backdrop-blur-md bg-gray-900/20">
          <div className="flex justify-between items-center">
            <div>
              <Link href={`/tasks/${task.id}`}>
                <h3 className="text-sm font-semibold text-white line-clamp-1">
                  {task.displayName || task.user?.name || "Task Owner"}
                </h3>
              </Link>
              <p className="text-xs font-semibold text-gray-200">
                {formatLocation(t, task.city)}
              </p>
            </div>

            {/* Favorite button - white color for visibility */}
            <FavoriteButton 
              taskId={task.id} 
              color={[255, 255, 255]}
              className="p-1 rounded-full backdrop-blur-sm bg-black/20"
            />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex justify-between items-center pt-6 -mt-2 text-sm text-gray-700">
        {/* Contact button */}
        {task.phoneNumber && (
          <Popover>
            <PopoverTrigger asChild>
              <Button className="bg-black text-white hover:bg-black/80 transition w-1/2" size="sm">
                <MessageCircleMore className="size-4" />         
                  {t("Common.contact")}
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
                {t("Common.whatsapp")}
              </button>
              <button
                onClick={() =>
                  (window.location.href = `tel:${task.phoneNumber}`)
                }
                className="flex gap-2 items-center px-2 py-1 text-sm rounded-md border transition hover:bg-gray-100"
              >
                <Phone className="size-4" />
                {t("Common.call")}
              </button>
            </PopoverContent>
          </Popover>
        )}

        {/* Budget/Price */}
        <span className="text-base font-semibold text-gray-900">
          {formatBudget(task.budget, t)}
        </span>
      </div>
    </div>
  );
}
