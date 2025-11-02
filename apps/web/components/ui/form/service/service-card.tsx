"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { slugify } from "@/lib/slugify";
import { Star, ChevronLeft, ChevronRight, Phone, MessageCircleMore } from "lucide-react";
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
    const currencyLabel = !service.currency || service.currency === "MAD" ? t("Currency.MAD") : service.currency;
    return `${t("Common.from")} ${price} ${currencyLabel}`;
  };

  const formatLocation = (
    city: string | null,
    stateAbbreviation: string | null
  ) => {
    const tCity = city ? (t.has?.("Cities." + city) ? t("Cities." + city) : city) : undefined;
    return tCity || "";
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

  return (
    <div className={cn("w-full cursor-pointer", className)}>
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
        <div className="absolute top-2 left-2">
          <CategoryBadge category={service.serviceCategory} type="service" />
        </div>

        {/* Favorite button - top right */}
        <div className="absolute top-2 right-2">
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
              onClick={prevImage}
              className="absolute left-2 top-1/2 p-1 rounded-full shadow -translate-y-1/2 bg-white/80"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 p-1 rounded-full shadow -translate-y-1/2 bg-white/80"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}

        {/* Dots */}
        {imagesToShow.length > 1 && (
          <div className="flex absolute bottom-2 left-1/2 gap-1 -translate-x-1/2">
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
        <div className="flex absolute right-0 bottom-0 left-0 flex-col px-3 py-2 rounded-t-md rounded-b-xl backdrop-blur-md bg-gray-900/20">
          <div className="flex justify-between items-center">
            <div>
              <Link
                href={`/services/${slugify(service.serviceCategory)}/${slugify(
                  service.city || "location"
                )}/${slugify(service.title)}/${service.id}`}
              >
                <h3 className="text-sm font-semibold text-white line-clamp-1">
                  {service.title}
                </h3>
              </Link>
              <p className="text-xs font-semibold text-gray-200">
                {formatLocation(service.city, service.stateAbbreviation)}
              </p>
            </div>

            {/* Rating */}
            <div className="flex gap-1 items-center text-sm font-medium text-white">
              <Star className="w-3.5 h-3.5 text-gray-200 fill-gray-200" />
              {service.averageRating
                ? `${service.averageRating.toFixed(1)}`
                : "4.8"}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex justify-between items-center pt-6 -mt-2 text-sm text-gray-700">
        {/* Contact button */}
        {service.phoneNumber && (
          <Popover>
            <PopoverTrigger asChild>
              <Button className="bg-black text-white hover:bg-black/80 transition w-1/3" size="sm">
                <MessageCircleMore className="size-4" />         
                {t("Common.contact")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col gap-2 w-40">
              <button
                onClick={() =>
                  window.open(`https://wa.me/${service.phoneNumber}`, "_blank")
                }
                className="flex items-center gap-2 text-sm text-white bg-[#25D366] px-2 py-1 rounded-md hover:bg-[#1ebe5d] transition"
              >
                <FontAwesomeIcon icon={faWhatsapp} className="size-4" />
                {t("Common.whatsapp")}
              </button>
              <button
                onClick={() => (window.location.href = `tel:${service.phoneNumber}`)}
                className="flex gap-2 items-center px-2 py-1 text-sm rounded-md border transition hover:bg-gray-100"
              >
                <Phone className="size-4" />
                {t("Common.call")}
              </button>
            </PopoverContent>
          </Popover>
        )}

        {/* Price */}
        <span className="text-base font-semibold text-gray-900">
          {formatPrice(service.price)}
        </span>
      </div>
    </div>
  );
}
