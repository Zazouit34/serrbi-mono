"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { slugify } from "@/lib/slugify";
import { MapPin, ChevronLeft, ChevronRight, Phone, Star } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { Card, CardContent, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { CategoryBadge } from "@/components/ui/category-badge";
import { formatPriceType } from "@workspace/ui/lib/formatter";

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
    priceType: string | null;
    currency: string;
    stateAbbreviation: string | null;
    city: string | null;
    phoneNumber: string | null;
    averageRating: number | null;
    numberOfReviews: number;
  };
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const formatPrice = (price: number, priceType: string | null) => {
    const priceText = `${price} ${service.currency || "MAD"}`;
    return priceType ? `${priceText}/${formatPriceType(priceType as any)}` : priceText;
  };

  const formatLocation = (
    city: string | null,
    stateAbbreviation: string | null
  ) => {
    if (city && stateAbbreviation) return `${city}, ${stateAbbreviation}`;
    if (city) return city;
    if (stateAbbreviation) return stateAbbreviation;
    return "Location not specified";
  };

  const handleContact = (value: "whatsapp" | "phone") => {
    if (!service.phoneNumber) return;
    if (value === "whatsapp") {
      window.open(`https://wa.me/${service.phoneNumber}`, "_blank");
    } else if (value === "phone") {
      window.location.href = `tel:${service.phoneNumber}`;
    }
  };

  const fallbackImages = [
    "https://images.unsplash.com/photo-1512678080530-7760d81faba6?q=80&w=874&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512102438733-bfa4ed29aef7?q=80&w=774&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1513224502586-d1e602410265?w=400&auto=format&fit=crop",
  ];

  const imagesToShow =
    service.images && service.images.length > 0
      ? service.images
      : fallbackImages;

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % imagesToShow.length);
  };

  const prevImage = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + imagesToShow.length) % imagesToShow.length
    );
  };

  return (
    <div className="flex justify-center sm:block">
      <Card
        className={cn(
          "overflow-hidden w-full max-w-xs sm:max-w-none rounded-3xl shadow-md hover:shadow-lg transition-all !py-0",
          className
        )}
      >
        {/* Image carousel */}
        <div className="px-2 pt-2">
          <div className="overflow-hidden relative w-full h-48 rounded-xl sm:h-64">
            <Image
              src={imagesToShow[currentIndex] || ""}
              alt={service.title}
              fill
              className="object-cover"
            />

            {/* Navigation arrows */}
            {imagesToShow.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 p-1 rounded-full shadow -translate-y-1/2 bg-white/80"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 p-1 rounded-full shadow -translate-y-1/2 bg-white/80"
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
          </div>
        </div>

        <CardContent className="px-3 pb-4 space-y-3">
          {/* Title + Category */}
          <div className="flex justify-between items-center">
            <CardTitle className="font-bold text-md line-clamp-1 md:text-lg">
              <Link
                href={`/services/${slugify(service.serviceCategory)}/${slugify(
                  service.city || "location"
                )}/${slugify(service.title)}/${service.id}`}
              >
                {service.title}
              </Link>
            </CardTitle>
            <CategoryBadge category={service.serviceCategory as any} type="service" />
          </div>

          {/* Location + Price */}
          <div className="flex justify-between items-start text-sm text-gray-700">
            <div className="flex flex-col">
              {/* Location */}
              <div className="flex gap-1 items-center text-xs font-semibold text-foreground/80 md:text-sm">
                <MapPin className="size-4" />
                <span>{formatLocation(service.city, service.stateAbbreviation)}</span>
              </div>

              {/* Rating under location */}
              <div className="flex gap-1 items-center">
                {service.averageRating && service.averageRating > 0 ? (
                  <>
                    <Star className="text-yellow-400 size-3 fill-yellow-400" />
                    <span className="text-sm font-medium">
                      {service.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-foreground/60">
                      ({service.numberOfReviews})
                    </span>
                  </>
                ) : (
                  <span className="flex gap-1 items-center text-xs italic text-foreground/50">
                    <Star className="size-3 text-foreground/30" />
                    New · Be the first to review
                  </span>
                )}
              </div>
            </div>

            {/* Price on the right */}
            <div className="text-xs font-semibold md:text-base text-foreground">
              {formatPrice(service.price, service.priceType)}
            </div>
          </div>

          {/* Footer - WhatsApp left / Call right */}
          {service.phoneNumber && (
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
