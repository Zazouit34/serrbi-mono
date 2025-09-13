"use client";

import { CarouselMain } from "@/components/ui/carousel-main";
import { HeroSearchBar } from "@/components/ui/hero-search-bar";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { AvatarGroup } from "@workspace/ui/components/ui/shadcn-io/avatar-group";
import { GradientText } from "@workspace/ui/components/ui/shadcn-io/gradient-text";

import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
  AnnouncementEnd,
} from "@workspace/ui/components/ui/shadcn-io/announcement";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Wrench,
  Stethoscope,
  Palette,
} from "lucide-react";

// Floating decorative icon component with size variants
const FloatingIcon = ({
  icon: Icon,
  className,
  bgColor,
  size = "large", // "large" or "small"
}: {
  icon: any;
  className: string;
  bgColor: string;
  size?: "large" | "medium" | "small";
}) => {
  const isLarge = size === "large";
  const isMedium = size === "medium";
  return (
    <div className={`absolute z-0 ${className} animate-float`}>
      <div
        className={`${isLarge ? "p-4" : isMedium ? "p-3.5" : "p-2.5"} rounded-2xl shadow-lg rotate-12 ${bgColor}`}
      >
        <Icon
          className={`text-white ${isLarge ? "size-6" : isMedium ? "size-5" : "size-3.5"}`}
        />
      </div>
    </div>
  );
};

export default function Hero() {
  const AVATARS = [
    {
      src: "https://pbs.twimg.com/profile_images/1909615404789506048/MTqvRsjo_400x400.jpg",
      fallback: "SK",
      tooltip: "Skyleen",
    },
    {
      src: "https://pbs.twimg.com/profile_images/1593304942210478080/TUYae5z7_400x400.jpg",
      fallback: "CN",
      tooltip: "Shadcn",
    },
    {
      src: "https://pbs.twimg.com/profile_images/1677042510839857154/Kq4tpySA_400x400.jpg",
      fallback: "AW",
      tooltip: "Adam Wathan",
    },
    {
      src: "https://pbs.twimg.com/profile_images/1783856060249595904/8TfcCN0r_400x400.jpg",
      fallback: "GR",
      tooltip: "Guillermo Rauch",
    },
    {
      src: "https://pbs.twimg.com/profile_images/1534700564810018816/anAuSfkp_400x400.jpg",
      fallback: "JH",
      tooltip: "Jhey",
    },
  ];

  return (
    <div className="flex overflow-hidden relative flex-col gap-16 px-8 text-center">
      {/* Top Left - Around H1 (Large, Front) */}
      <FloatingIcon
        icon={Briefcase}
        className="hidden left-8 top-40 lg:left-16 lg:block"
        bgColor="bg-gradient-to-br from-orange-400 to-orange-600"
        size="large"
      />

      {/* Top Right - Around H1 (Small, Back) */}
      <FloatingIcon
        icon={Wrench}
        className="hidden right-12 top-32 lg:right-20 lg:block"
        bgColor="bg-gradient-to-br from-rose-400 to-rose-600"
        size="medium"
      />

      {/* Bottom Left - Around Buttons (Small, Back) */}
      <FloatingIcon
        icon={Stethoscope}
        className="hidden left-16 top-96 md:block lg:left-24"
        bgColor="bg-gradient-to-br from-yellow-400 to-yellow-600"
        size="medium"
      />

      {/* Bottom Right - Around Buttons (Large, Front) */}
      <FloatingIcon
        icon={Palette}
        className="hidden right-8 top-98 md:block lg:right-16"
        bgColor="bg-gradient-to-br from-purple-400 to-purple-600"
        size="large"
      />

      <div className="flex relative z-10 flex-col gap-8 justify-center items-center">
        <Announcement>
          <AnnouncementTag className="ml-1 font-semibold text-white bg-gradient-to-r from-red-500 via-pink-500 to-rose-500">
            New
          </AnnouncementTag>
          <AnnouncementTitle>
            <span className="font-semibold text-foreground/70">
              Feature Release coming soon
            </span>
            <ArrowUpRight className="size-4 text-[#ff040e]" />
          </AnnouncementTitle>
          <AnnouncementEnd>
            <AvatarGroup variant="css">
              {AVATARS.map((avatar, index) => (
                <Avatar key={index}>
                  <AvatarImage src={avatar.src} />
                  <AvatarFallback>{avatar.fallback}</AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
          </AnnouncementEnd>
        </Announcement>
        <h1 className="mb-0 text-balance font-medium text-3xl md:text-5xl xl:text-[5.25rem]">
          AI qui connecte aux <GradientText text="opportunités" />
        </h1>

        <HeroSearchBar />

        <p className="mt-0 mb-0 text-lg text-balance text-muted-foreground">
          Serrbi is a unified marketplace where you can find jobs, services, and
          gigs for freelancers. Connect with opportunities across all industries
          and skill levels.
        </p>

        <CarouselMain />
      </div>
    </div>
  );
}
