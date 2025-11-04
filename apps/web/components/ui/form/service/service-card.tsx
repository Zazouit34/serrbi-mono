"use client";

import Image from "next/image";
import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { cn } from "@workspace/ui/lib/utils";
import { CategoryBadge } from "@/components/ui/category-badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { useTranslations } from "next-intl";

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
    // Priority: displayImage > images array > fallback images
    if (service.displayImage) {
      return [service.displayImage];
    }
    if (service.images && service.images.length > 0) {
      return service.images;
    }
    return fallbackImages;
  })();

  const isS3OrExternal = (() => {
    const src = imagesToShow[currentIndex] || "";
    try {
      const u = new URL(src);
      return u.hostname.includes("amazonaws.com") || u.hostname.includes("s3.");
    } catch {
      return false;
    }
  })();

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % imagesToShow.length);
  };

  const prevImage = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + imagesToShow.length) % imagesToShow.length
    );
  };

  const cardContent = (
    <>
      {/* Image Section with carousel */}
      <div className="overflow-hidden relative w-full rounded-xl shadow-md aspect-square">
        <Image
          src={imagesToShow[currentIndex] || ""}
          alt={service.title}
          fill
          className="object-cover"
          unoptimized={isS3OrExternal}
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
                prevImage();
              }}
              className="absolute left-2 top-1/2 z-10 p-1 rounded-full shadow -translate-y-1/2 bg-white/80 hover:bg-white transition"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-2 top-1/2 z-10 p-1 rounded-full shadow -translate-y-1/2 bg-white/80 hover:bg-white transition"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}

        {/* Dots */}
        {imagesToShow.length > 1 && (
          <div
            className="flex absolute bottom-2 left-1/2 gap-1 -translate-x-1/2 z-10"
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

        {/* Glass Overlay */}
        <div className="flex absolute right-0 bottom-0 left-0 flex-col px-3 py-2 rounded-t-md rounded-b-xl backdrop-blur-md bg-black/30">
          <div className="flex justify-between items-center">
            {/* Price */}
            <div className="text-sm font-semibold text-white">
              {formatPrice(service.price)}
            </div>

            {/* Rating */}
            <div className="flex gap-1 items-center text-sm font-medium">
              <Star className="w-3.5 h-3.5 text-[#FFDF22] fill-[#FFDF22]" />
              <span className="text-[#FFDF22]">
                {service.averageRating
                  ? `${service.averageRating.toFixed(1)}`
                  : "4.8"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Service Title */}
      <div className="pt-4 -mt-2">
        <h3 className="text-base font-semibold text-gray-900 line-clamp-2 text-left">
          {service.title}
        </h3>
      </div>
    </>
  );

  if (service.phoneNumber) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className={cn("w-full cursor-pointer", className)}>
            {cardContent}
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          avoidCollisions={false}
          collisionPadding={0}
          sideOffset={0}
          className="flex flex-col gap-2 w-48 absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[40%]"
        >
          <button
            onClick={() =>
              window.open(`https://wa.me/${service.phoneNumber}`, "_blank")
            }
            className="flex items-center gap-2 text-sm text-white bg-[#25D366] px-3 py-2 rounded-md hover:bg-[#1ebe5d] transition focus:outline-none focus:ring-0 border-none"
          >
            <FontAwesomeIcon icon={faWhatsapp} className="size-5" />
            {t("Common.whatsapp")}
          </button>
          <button
            onClick={() =>
              (window.location.href = `tel:${service.phoneNumber}`)
            }
            className="flex gap-2 items-center px-3 py-2 text-sm rounded-md border transition hover:bg-gray-100 focus:outline-none focus:ring-0"
          >
            <Phone className="size-5" />
            {t("Common.call")}
          </button>
        </PopoverContent>
      </Popover>
    );
  }

  return <div className={cn("w-full", className)}>{cardContent}</div>;
}
