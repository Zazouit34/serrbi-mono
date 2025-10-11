"use client";
import { useParams } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import { Container } from "@workspace/ui/components/container";
import { MarkdownRendererClient } from "@/components/ui/form/markdown-render.client";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { 
  ClockIcon, 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  Globe, 
  User,
  Clock
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { CategoryBadge } from "@/components/ui/category-badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";


export default function ServiceDetailsPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { data: service, isLoading } = trpc.service.getById.useQuery({ id: serviceId });

  const daysAgo = service?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(service.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const formatPrice = (price: number| null) => {
    return `${price} MAD`;
  };

  const formatLocation = (city: string | null, stateAbbreviation: string | null, address: string | null) => {
    const parts = [];
    if (address) parts.push(address);
    if (city) parts.push(city);
    if (stateAbbreviation) parts.push(stateAbbreviation);
    return parts.length > 0 ? parts.join(", ") : "Location not specified";
  };

  const handleContact = (value: "whatsapp" | "phone" | "email") => {
    if (value === "whatsapp" && service?.phoneNumber) {
      window.open(`https://wa.me/${service.phoneNumber}`, "_blank");
    } else if (value === "phone" && service?.phoneNumber) {
      window.location.href = `tel:${service.phoneNumber}`;
    } else if (value === "email" && service?.email) {
      window.location.href = `mailto:${service.email}`;
    }
  };

  // Morocco standard business hours
  const moroccoBusinessHours = [
    { day: "Monday", open: "09:00", close: "18:00" },
    { day: "Tuesday", open: "09:00", close: "18:00" },
    { day: "Wednesday", open: "09:00", close: "18:00" },
    { day: "Thursday", open: "09:00", close: "18:00" },
    { day: "Friday", open: "09:00", close: "18:00" },
    { day: "Saturday", open: "09:00", close: "13:00" },
    { day: "Sunday", open: "Closed", close: "Closed" },
  ];

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="space-y-6">
          <Skeleton className="w-3/4 h-8" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="w-full h-6" />
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-5/6 h-4" />
              <Skeleton className="w-4/5 h-4" />
            </div>
            <div className="space-y-4">
              <Skeleton className="w-full h-32" />
            </div>
          </div>
        </div>
      </Container>
    );
  }

  if (!service) {
    return (
      <Container className="py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">Service not found</h1>
          <p className="text-muted-foreground">The service you're looking for doesn't exist.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex gap-4 justify-between items-start">
              <h1 className="text-3xl font-bold leading-tight">{service.title}</h1>
              <div className="flex flex-wrap gap-2">
                <CategoryBadge category={service.serviceCategory as any} type="service" />
                {service.type && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-sm text-foreground/80">
                    {service.type}
                  </span>
                )}
              </div>
            </div>

            {/* Provider Info */}
            <div className="flex gap-3 items-center">
              <Avatar className="size-12">
                <AvatarImage 
                  src={service.displayImage || service.user?.image || ""} 
                  alt={service.user?.name || service.title} 
                />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {service.user?.name?.[0] || service.title[0] || "S"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex gap-2 items-center">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-medium">{service.displayName || service.user?.name}</span>
                </div>
                {daysAgo !== null && (
                  <div className="flex gap-1 items-center text-sm text-muted-foreground">
                    <ClockIcon className="size-3" />
                    Posted {daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`}
                  </div>
                )}
              </div>
            </div>

            {/* Rating */}
            <div className="flex gap-2 items-center">
              {service.averageRating && service.averageRating > 0 ? (
                <>
                  <div className="flex gap-1 items-center">
                    <Star className="text-yellow-400 size-4 fill-yellow-400" />
                    <span className="font-medium">{service.averageRating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">({service.numberOfReviews} reviews)</span>
                </>
              ) : (
                <div className="flex gap-1 items-center text-sm text-muted-foreground">
                  <Star className="size-4 text-muted-foreground/50" />
                  <span>New service • No reviews yet</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {service.description && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">About this service</h2>
              <div className="max-w-none prose prose-sm text-foreground/80">
                <MarkdownRendererClient source={service.description} />
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-3">
            <h2 className="flex gap-2 items-center text-xl font-semibold">
              <MapPin className="size-5 text-primary" />
              Location
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <p className="text-foreground/80">
                    {formatLocation(service.city, service.stateAbbreviation, service.address)}
                  </p>
                  {service.city && service.stateAbbreviation && (
                    <div className="inline-flex gap-2 items-center px-4 py-2 text-sm font-medium rounded-full bg-primary/10 text-primary">
                      <MapPin className="size-4" />
                      {service.city}, {service.stateAbbreviation}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Hours */}
          <div className="space-y-3">
            <h2 className="flex gap-2 items-center text-xl font-semibold">
              <Clock className="size-5 text-primary" />
              Business Hours
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {moroccoBusinessHours.map((hours, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="font-medium">{hours.day}</span>
                      <div className="flex gap-2 items-center text-sm">
                        {hours.open === "Closed" ? (
                          <span className="text-muted-foreground">Closed</span>
                        ) : (
                          <>
                            <Clock className="size-3 text-muted-foreground" />
                            <span className="text-foreground/80">{hours.open} - {hours.close}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar - Only Pricing Card */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">
                    {formatPrice(service.price)}
                  </div>
                </div>

                {/* Contact Buttons */}
                <div className="space-y-3">
                  {service.phoneNumber && (
                    <>
                      <Button 
                        onClick={() => handleContact("whatsapp")}
                        className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                        size="lg"
                      >
                        <FontAwesomeIcon icon={faWhatsapp} className="mr-2 size-4" />
                        Contact via WhatsApp
                      </Button>
                      <Button 
                        onClick={() => handleContact("phone")}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        <Phone className="mr-2 size-4" />
                        Call Now
                      </Button>
                    </>
                  )}
                  {service.email && (
                    <Button 
                      onClick={() => handleContact("email")}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <Mail className="mr-2 size-4" />
                      Send Email
                    </Button>
                  )}
                  {service.website && (
                    <Button 
                      onClick={() => window.open(service.website!, "_blank")}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <Globe className="mr-2 size-4" />
                      Visit Website
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}