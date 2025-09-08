"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { slugify } from "@/lib/slugify";
import {
  ClockIcon,
  MapPin,
  Star,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { Card, CardContent, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { CategoryBadge } from "@/components/ui/category-badge";

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
    type: string | null;
    price: number;
    priceType: string | null;
    currency: string;
    stateAbbreviation: string | null;
    city: string | null;
    phoneNumber: string | null;
    averageRating: number | null;
    numberOfReviews: number;
    user?: { name?: string | null; image?: string | null } | null;
    createdAt?: Date | string;
  };
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const daysAgo = service.createdAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(service.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const formatPrice = (price: number, priceType: string | null) => {
    const priceText = `${price} ${service.currency || "MAD"}`;
    return priceType ? `${priceText}/${priceType}` : priceText;
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

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % imagesToShow.length);
  };
  
  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + imagesToShow.length) % imagesToShow.length);
  };

  const fallbackImages = [
    "https://images.unsplash.com/photo-1512678080530-7760d81faba6?q=80&w=874&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1512102438733-bfa4ed29aef7?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1513224502586-d1e602410265?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fGhvc3BpdGFsfGVufDB8fDB8fHww"
   
  ]
  
  const imagesToShow =
    service.images && service.images.length > 0
      ? service.images
      : fallbackImages
  

  return (
    <Card
      className={cn(
        "overflow-hidden md:w-md rounded-3xl shadow-md hover:shadow-lg transition-all !py-0",
        className
      
      )}
    >
      {/* Image carousel */}
      <div className="p-4">
        <div className="relative w-full h-52 rounded-2xl overflow-hidden">
          <Image
            src={
              imagesToShow?.[currentIndex] ??
              [
                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=center",
                "https://imgs.search.brave.com/ZeYvSfT6KWIIw3qLEhIDlXkspf0psLFy9fHz0_S5GZY/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93d3cu/Y2l0eXBuZy5jb20v/cHVibGljL3VwbG9h/ZHMvcHJldmlldy9k/b3dubG9hZC1oZC1t/ZXRhLWZhY2Vib29r/LWxvZ28tcG5nLTcw/MTc1MTY5NDc3NzA2/N2hxcXdtM2Rvcmgu/cG5n"
              ][currentIndex % 2] ?? ""
            }
            alt={service.title}
            fill
            className="object-cover"
          />

          {/* Navigation arrows */}
          {imagesToShow.length > 1 &&(
            <>
              <button
                onClick={prevImage}
                className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={nextImage}
                className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow"
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          )}

          {/* Dots */}
          {imagesToShow.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
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

      <CardContent className="pb-4 px-4 pt-0 space-y-4 ">
        {/* Top row: Category + type on the right, avatar + name + daysAgo on left */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar className="rounded-md size-10">
              <AvatarImage
                src={service.displayImage || service.user?.image || ""}
                alt={service.user?.name || service.title}
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {service.user?.name?.[0] || service.title[0] || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">
                {service.user?.name || "Service Provider"}
              </span>
              {daysAgo !== null && (
                <span className="flex gap-1 items-center text-xs text-foreground/60">
                  <ClockIcon className="size-3" />
                  {daysAgo === 0
                    ? "Today"
                    : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <CategoryBadge
              category={service.serviceCategory as any}
              type="service"
            />
            {service.type && (
              <span className="px-2 py-0.5 rounded-md border text-xs text-foreground/70">
                {service.type}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <Link href={`/services/${slugify(service.title)}/${service.id}`}>
          <CardTitle className="text-xl font-bold hover:underline">
            {service.title}
          </CardTitle>
        </Link>

        {/* Rating */}
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

        {/* Location */}
        <div className="flex gap-1 items-center text-foreground/80 text-sm">
          <MapPin className="size-4" />
          <span>{formatLocation(service.city, service.stateAbbreviation)}</span>
        </div>

        {/* Footer row: Price on left, Contact on right */}
        <div className="flex justify-between items-center border-t pt-3 mt-3">
          <div className="text-base font-semibold text-foreground">
            {formatPrice(service.price, service.priceType)}
          </div>

          {service.phoneNumber && (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}
