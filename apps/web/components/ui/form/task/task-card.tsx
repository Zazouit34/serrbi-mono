"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Phone, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { cn } from "@workspace/ui/lib/utils";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { useTranslations } from "next-intl";

export function TaskCard({ task, className }: any) {
  const t = useTranslations();
  const [contactOpen, setContactOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const formatLocation = (city?: string | null) => {
    const tCity = city ? (t.has?.("Cities." + city) ? t("Cities." + city) : city) : undefined;
    return tCity || "";
  };

  const formatBudget = (budget?: number | null) => {
    return `${t("Common.from")} ${budget ?? ""} ${t("Currency.MAD")}`;
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (contactOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setContactOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setContactOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [contactOpen]);

  return (
    <div className={cn("w-full cursor-pointer", className)}>
      <div onClick={() => contactOpen && setContactOpen(false)}>
        {/* Card visual */}
        <div ref={containerRef} className="overflow-hidden relative w-full rounded-xl shadow-md aspect-square">
          {/* Center text instead of image */}
          <div
            className="flex justify-center items-center w-full h-full text-center"
            style={{ background: task.bgStyle || "linear-gradient(to right, #ddd, #ccc)" }}
          >
            <span className="px-4 text-xl font-bold text-white line-clamp-4">{task.description}</span>
          </div>

          {/* Category - top left */}
          <div className="absolute top-2 left-2">
            <div className="px-3 py-1 text-xs font-medium text-gray-800 bg-white rounded-full shadow-sm">
              {task.category}
            </div>
          </div>

          {/* Favorite - top right */}
          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <FavoriteButton
              taskId={task.id}
              color={[255, 255, 255]}
              className="p-1 rounded-full backdrop-blur-sm bg-black/20"
            />
          </div>

          {/* Bottom Expandable Overlay (like service-card) */}
          <div
            ref={overlayRef}
            style={{ maxHeight: contactOpen ? 140 : 52, transition: "max-height 280ms ease" }}
            className={cn(
              "absolute right-0 bottom-0 left-0 z-10 px-3 py-2 rounded-t-md backdrop-blur-md bg-black/30 overflow-hidden"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white leading-tight">
                {formatBudget(task.budget)}
              </div>

              {!contactOpen && task.phoneNumber && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContactOpen(true);
                  }}
                  className="bg-white/95 text-gray-900 text-xs font-medium px-2.5 py-1 rounded-md shadow-sm hover:bg-white transition"
                >
                  {t("Common.contact")}
                </button>
              )}
            </div>

            <div
              className={cn(
                "transition-[opacity,max-height,margin] duration-300 overflow-hidden",
                contactOpen ? "mt-2 max-h-40 opacity-100 pointer-events-auto" : "mt-0 max-h-0 opacity-0 pointer-events-none"
              )}
            >
              <div className="grid grid-cols-2 gap-2 items-center">
                {/* WhatsApp */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task.phoneNumber) {
                      window.open(`https://wa.me/${task.phoneNumber}`, "_blank");
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md"
                  style={{ backgroundColor: "#25D366", color: "white" }}
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="size-3.5" />
                  <span className="truncate">{t("Common.whatsapp")}</span>
                </button>

                {/* Call */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task.phoneNumber) window.location.href = `tel:${task.phoneNumber}`;
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white/95 text-gray-900"
                >
                  <Phone className="size-3.5" />
                  <span className="truncate">{t("Common.call")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row: name left, location right */}
        <div className="pt-4 -mt-2">
          <div className="flex items-start justify-between">
            <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
              {task.displayName || task.user?.name || "Task Owner"}
            </h3>
            <span className="text-sm font-semibold text-gray-500">
              {formatLocation(task.city)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
