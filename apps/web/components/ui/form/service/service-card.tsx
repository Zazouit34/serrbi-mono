"use client"
import Link from "next/link"
import { slugify } from "@/lib/slugify"
import { ClockIcon, MapPin, Star, Phone } from "lucide-react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons"
import { Card, CardTitle, CardContent } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { CategoryBadge } from "@/components/ui/category-badge"

export function ServiceCard({ service, className }: {
  service: {
    id: string
    title: string
    displayName: string | null
    displayImage: string | null
    description: string
    serviceCategory: string
    type: string | null
    price: number
    priceType: string | null
    currency: string
    stateAbbreviation: string | null
    city: string | null
    address: string | null
    phoneNumber: string | null
    email: string | null
    website: string | null
    averageRating: number | null
    numberOfReviews: number
    profilePictures: string[]
    user?: { name?: string | null; image?: string | null } | null
    createdAt?: Date | string
  }
  className?: string
}) {
  const daysAgo = service.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(service.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null

  const formatPrice = (price: number, priceType: string | null) => {
    const priceText = `${price} ${service.currency || "MAD"}`
    return priceType ? `${priceText}/${priceType}` : priceText
  }

  const formatLocation = (city: string | null, stateAbbreviation: string | null) => {
    if (city && stateAbbreviation) return `${city}, ${stateAbbreviation}`
    if (city) return city
    if (stateAbbreviation) return stateAbbreviation
    return "Location not specified"
  }

  const handleContact = (value: "whatsapp" | "phone") => {
    if (!service.phoneNumber) return
    if (value === "whatsapp") {
      window.open(`https://wa.me/${service.phoneNumber}`, "_blank")
    } else if (value === "phone") {
      window.location.href = `tel:${service.phoneNumber}`
    }
  }

  return (
    <Card className={cn("@container relative group hover:shadow-lg transition-shadow", className)}>
      <CardContent className="space-y-3">
        
        {/* Title + Category on the same row */}
        <div className="flex gap-3 justify-between items-start">
          <Link href={`/services/${slugify(service.title)}/${service.id}`} className="flex-1">
            <CardTitle className="text-lg font-bold hover:underline line-clamp-2">
              {service.title}
            </CardTitle>
          </Link>

          <div className="flex flex-wrap gap-2 justify-end">
            <CategoryBadge category={service.serviceCategory as any} type="service" />
            {service.type && (
              <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs text-foreground/70">
                {service.type}
              </span>
            )}
          </div>
        </div>

        {/* Provider + Avatar + Time */}
        <div className="flex gap-3 items-center">
          <Avatar className="rounded-md size-9">
            <AvatarImage 
              src={service.displayImage || service.user?.image || ""} 
              alt={service.user?.name || service.title} 
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              {service.user?.name?.[0] || service.title[0] || "S"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">{service.user?.name || "Service Provider"}</span>
            {daysAgo !== null && (
              <span className="flex gap-1 items-center text-xs text-foreground/60">
                <ClockIcon className="size-3" />
                {daysAgo === 0 ? "Today" : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`}
              </span>
            )}
          </div>
        </div>

        {/* Location + Price badges */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex gap-1 items-center">
            <MapPin className="size-3 text-primary" />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium">
              {formatLocation(service.city, service.stateAbbreviation)}
            </span>
          </div>
          <div className="rounded-md bg-green-50 px-2 py-0.5 text-green-600 font-semibold">
            {formatPrice(service.price, service.priceType)}
          </div>
        </div>

        {/* Rating */}
        <div className="flex gap-1 items-center">
          {service.averageRating && service.averageRating > 0 ? (
            <>
              <Star className="text-yellow-400 size-3 fill-yellow-400" />
              <span className="text-sm font-medium">{service.averageRating.toFixed(1)}</span>
              <span className="text-xs text-foreground/60">({service.numberOfReviews})</span>
            </>
          ) : (
            <span className="flex gap-1 items-center text-xs italic text-foreground/50">
              <Star className="size-3 text-foreground/30" />
              New · Be the first to review
            </span>
          )}
        </div>

        {/* Contact buttons */}
        {service.phoneNumber && (
          <div className="flex gap-2 pt-2">
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
  )
}
