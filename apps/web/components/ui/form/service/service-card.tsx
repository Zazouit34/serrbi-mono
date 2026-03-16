"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { cn } from "@workspace/ui/lib/utils";
import { serviceCategoryStyles } from "@workspace/ui/lib/formatter";
import { CategoryBadge } from "@/components/ui/category-badge";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { useTranslations } from "next-intl";
import { Skeleton } from "@workspace/ui/components/skeleton";

function buildServiceHref(service: {
  id: string;
  serviceCategory: string;
  city: string | null;
  title: string;
}) {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const cat = slug(service.serviceCategory || "other");
  const city = slug(service.city || "all");
  const title = slug(service.title || "service");
  return `/services/${cat}/${city}/${title}/${service.id}`;
}

export function ServiceCard({
  service,
  className,
  compact,
  disableCarousel,
  disableFallbackImages,
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
    website?: string | null;
    type?: string | null;
    averageRating: number | null;
    numberOfReviews: number;
  };
  className?: string;
  compact?: boolean;
  disableCarousel?: boolean;
  disableFallbackImages?: boolean;
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
    if (disableFallbackImages) return [];
    return fallbackImages;
  })();
  const activeImages = disableCarousel ? imagesToShow.slice(0, 1) : imagesToShow;

  const [imageLoaded, setImageLoaded] = useState(false);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeImages.length);
    setImageLoaded(false);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(
      (prev) => (prev - 1 + activeImages.length) % activeImages.length
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

  return (
    <Link
      href={buildServiceHref(service)}
      className={cn("block w-full", className)}
      onClick={(e) => { if (contactOpen) e.preventDefault(); }}
    >
        {/* Image Section with carousel */}
        <div
          ref={containerRef}
          className={cn(
            "overflow-hidden relative w-full rounded-xl shadow-md aspect-square",
            compact && "aspect-[4/3]"
          )}
        >
          {activeImages.length > 0 && !imageLoaded && (
            <div className="absolute inset-0 z-0">
              <Skeleton className="w-full h-full" />
            </div>
          )}
          {activeImages.length > 0 ? (
            <Image
              src={activeImages[currentIndex] || ""}
              alt={service.title}
              fill
              className={`object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              sizes="(max-width: 768px) 100vw, 25vw"
              onLoadingComplete={() => setImageLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-medium">
              No image
            </div>
          )}

          {/* Type badge - top left (specific profession, colored by parent category) */}
          <div
            className="absolute top-2 left-2 z-10"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            {service.type ? (
              <span className={cn(
                "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium",
                serviceCategoryStyles[service.serviceCategory as keyof typeof serviceCategoryStyles]?.color
                  ?? "bg-slate-100 text-slate-700 border-slate-300",
              )}>
                {service.type}
              </span>
            ) : (
              <CategoryBadge category={service.serviceCategory} type="service" />
            )}
          </div>

          {/* Favorite button - top right */}
          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <FavoriteButton
              serviceId={service.id}
              color={[255, 255, 255]}
              className="p-1 rounded-full backdrop-blur-sm bg-black/20"
            />
          </div>

          {/* Navigation arrows */}
          {activeImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  prevImage(e);
                }}
                className="absolute left-2 top-1/2 z-10 p-1 rounded-full shadow transition -translate-y-1/2 bg-white/80 hover:bg-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
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
          {activeImages.length > 1 && (
            <div
              className="flex absolute bottom-2 left-1/2 z-10 gap-1 -translate-x-1/2"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              {activeImages.map((_, i) => (
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
          {!compact && (
            <div
              ref={overlayRef}
              style={{
                maxHeight: contactOpen ? 140 : 52,
                transition: "max-height 280ms ease",
              }}
              className={cn(
                "overflow-hidden absolute right-0 bottom-0 left-0 z-10 px-3 py-2 rounded-t-md backdrop-blur-md bg-black/30",
              )}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
                      e.preventDefault();
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
                    ? "mt-2.5 max-h-40 opacity-100 pointer-events-auto"
                    : "mt-0 max-h-0 opacity-0 pointer-events-none",
                )}
                aria-hidden={!contactOpen}
              >
                <div className="flex items-stretch gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (service.phoneNumber) {
                        window.open(`https://wa.me/${service.phoneNumber}`, "_blank");
                      }
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-white transition active:scale-95"
                    style={{ backgroundColor: "#25D366" }}
                    aria-label="WhatsApp"
                  >
                    <FontAwesomeIcon icon={faWhatsapp} className="size-4" />
                    <span className="text-[11px] font-semibold">WhatsApp</span>
                  </button>

                  {service.website && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = service.website!.startsWith("http") ? service.website! : `https://${service.website}`;
                        window.open(url, "_blank");
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-white transition active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                      }}
                      aria-label="Website"
                    >
                      <FontAwesomeIcon icon={faInstagram} className="size-4" />
                      <span className="text-[11px] font-semibold">Site</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (service.phoneNumber) {
                        window.location.href = `tel:${service.phoneNumber}`;
                      }
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/90 py-2 text-gray-900 transition active:scale-95 hover:bg-white"
                    aria-label="Call"
                  >
                    <Phone className="size-3.5" />
                    <span className="text-[11px] font-semibold">{t("Common.call")}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row - Service Title (80%) + Rating (20%) */}
        <div className={cn("pt-4 -mt-2", compact && "pt-2")}>
          <div className="flex gap-3 items-start">
            <h3
              className={cn(
                "text-base font-semibold text-gray-900 line-clamp-2",
                compact && "text-xs",
              )}
              style={{ flex: "0 1 80%" }}
            >
              {service.title}
            </h3>

            <div
              className={cn(
                "flex gap-1 justify-end items-center text-sm font-semibold",
                compact && "text-xs",
              )}
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
    </Link>
  );
}
