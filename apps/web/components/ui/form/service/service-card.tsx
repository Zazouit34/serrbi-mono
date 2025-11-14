"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { cn } from "@workspace/ui/lib/utils";
import { CategoryBadge } from "@/components/ui/category-badge";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { useTranslations } from "next-intl";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function ServiceCard({
  service,
  className,
}: {
  service: {
    id: string;
    title: string;
    displayImage: string | null;
    images?: string[];
    serviceCategory: string;
    price: number;
    currency: string;
    stateAbbreviation: string | null;
    city: string | null;
    phoneNumber: string | null;
    averageRating: number | null;
    numberOfReviews: number;
  };
  className?: string;
}) {
  const t = useTranslations();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const formatPrice = (price: number) => {
    const currencyLabel =
      !service.currency || service.currency === "MAD"
        ? t("Currency.MAD")
        : service.currency;
    return `${t("Common.from")} ${price} ${currencyLabel}`;
  };

  const fallbackImages = [
    "https://images.unsplash.com/photo-1512678080530-7760d81faba6?q=80&w=874&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512102438733-bfa4ed29aef7?q=80&w=774&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1513224502586-d1e602410265?w=400&auto=format&fit=crop",
  ];

  const imagesToShow = (() => {
    if (service.displayImage) return [service.displayImage];
    if (service.images && service.images.length > 0) return service.images;
    return fallbackImages;
  })();

  const [imageLoaded, setImageLoaded] = useState(false);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % imagesToShow.length);
    setImageLoaded(false);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(
      (prev) => (prev - 1 + imagesToShow.length) % imagesToShow.length
    );
    setImageLoaded(false);
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        contactOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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

  // If there is no phone, just render the card (contact will be inactive anyway)
  return (
    <div className={cn("w-full", className)}>
      {/* Entire card is clickable if you want; clicking outside closes the contact expanded state (handled above) */}
      <div onClick={() => contactOpen && setContactOpen(false)}>
        {/* Image Section with carousel */}
        <div
          ref={containerRef}
          className="overflow-hidden relative w-full rounded-xl shadow-md aspect-square"
        >
          {!imageLoaded && (
            <div className="absolute inset-0 z-0">
              <Skeleton className="w-full h-full" />
            </div>
          )}
          <Image
            src={imagesToShow[currentIndex] || ""}
            alt={service.title}
            fill
            className={`object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            sizes="(max-width: 768px) 100vw, 25vw"
            onLoadingComplete={() => setImageLoaded(true)}
          />

          {/* Category badge - top left */}
          <div
            className="absolute top-2 left-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <CategoryBadge category={service.serviceCategory} type="service" />
          </div>

          {/* Favorite button - top right */}
          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <FavoriteButton
              serviceId={service.id}
              color={[255, 255, 255]}
              className="p-1 rounded-full backdrop-blur-sm bg-black/20"
            />
          </div>

          {/* Navigation arrows */}
          {imagesToShow.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage(e);
                }}
                className="absolute left-2 top-1/2 z-10 p-1 rounded-full shadow transition -translate-y-1/2 bg-white/80 hover:bg-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage(e);
                }}
                className="absolute right-2 top-1/2 z-10 p-1 rounded-full shadow transition -translate-y-1/2 bg-white/80 hover:bg-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          )}

          {/* Dots */}
          {imagesToShow.length > 1 && (
            <div
              className="flex absolute bottom-2 left-1/2 z-10 gap-1 -translate-x-1/2"
              onClick={(e) => e.stopPropagation()}
            >
              {imagesToShow.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    i === currentIndex ? "bg-primary" : "bg-white/70"
                  )}
                />
              ))}
            </div>
          )}

          {/* Expandable Overlay (price + contact button collapsed; price + whatsapp/call when expanded) */}
          <div
            ref={overlayRef}
            style={{
              maxHeight: contactOpen ? 140 : 52,
              transition: "max-height 280ms ease",
            }}
            className={cn(
              "overflow-hidden absolute right-0 bottom-0 left-0 z-10 px-3 py-2 rounded-t-md backdrop-blur-md bg-black/30"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top row inside overlay: price (left) + contact button (right when collapsed) */}
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold leading-tight text-white">
                {formatPrice(service.price)}
              </div>

              {/* Collapsed contact button (visible when contactOpen === false) */}
              {!contactOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContactOpen(true);
                  }}
                  className="bg-white/95 text-gray-900 text-xs font-medium px-2.5 py-1 rounded-md shadow-sm hover:bg-white transition focus:outline-none"
                  aria-expanded="false"
                >
                  {t("Common.contact")}
                </button>
              )}
            </div>

            {/* Expanded area - collapses in layout when closed */}
            <div
              className={cn(
                "transition-[opacity,max-height,margin] duration-300 overflow-hidden",
                contactOpen
                  ? "mt-2 max-h-40 opacity-100 pointer-events-auto"
                  : "mt-0 max-h-0 opacity-0 pointer-events-none"
              )}
              aria-hidden={!contactOpen}
            >
              <div className="grid grid-cols-2 gap-2 items-center">
                {/* WhatsApp */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (service.phoneNumber) {
                      window.open(`https://wa.me/${service.phoneNumber}`, "_blank");
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition"
                  style={{ backgroundColor: "#25D366", color: "white" }}
                >
                  <FontAwesomeIcon icon={faWhatsapp} className="size-3.5" />
                  <span className="truncate">{t("Common.whatsapp")}</span>
                </button>

                {/* Call */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (service.phoneNumber) {
                      window.location.href = `tel:${service.phoneNumber}`;
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white/95 text-gray-900 transition"
                >
                  <Phone className="size-3.5" />
                  <span className="truncate">{t("Common.call")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Service Title (80%) + Rating (20%) */}
        <div className="pt-4 -mt-2">
          <div className="flex gap-3 items-start">
            <h3
              className="text-base font-semibold text-gray-900 line-clamp-2"
              style={{ flex: "0 1 80%" }}
            >
              {service.title}
            </h3>

            <div
              className="flex gap-1 justify-end items-center text-sm font-semibold"
              style={{ flex: "0 0 20%" }}
            >
              <Star className="text-gray-400 size-3 fill-gray-400" />
              <span className="text-gray-500">
                {service.averageRating ? service.averageRating.toFixed(1) : "4.8"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
