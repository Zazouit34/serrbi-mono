"use client";

import { HeroSearchBar } from "@/components/ui/hero-search-bar";
import { GradientText } from "@workspace/ui/components/ui/shadcn-io/gradient-text";

import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from "@workspace/ui/components/ui/shadcn-io/announcement";

import {
  ArrowUpRight,
  Briefcase,
  Wrench,
  Stethoscope,
  Palette,
} from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Hero");
  // avatars removed on mobile for better fit

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

      <div className="flex relative z-10 flex-col gap-6 justify-center items-center">
        <Announcement className="px-3 py-2 text-[12px] md:text-[14px] w-auto rounded-full inline-flex items-center gap-2">
          <AnnouncementTag className="ml-1 font-semibold text-white bg-gradient-to-r from-red-500 via-pink-500 to-rose-500">
            {t("announcementNew")}
          </AnnouncementTag>
          <AnnouncementTitle>
            <span className="font-semibold text-foreground/70 block md:hidden">
              {t("announcementTitleShort")}
            </span>
            <span className="hidden md:inline font-semibold text-foreground/70">
              {t("announcementTitle")}
            </span>
            <ArrowUpRight className="size-4 text-[#ff040e]" />
          </AnnouncementTitle>
        </Announcement>
        <h1 className="mb-0 text-balance font-medium text-3xl md:text-[80px] xl:text-[80px] leading-tight">
        {t("headingLine1")} <br />
          <GradientText
            className="font-playfair text-4xl md:text-[80px] xl:text-[80px] font-semibold"
            text={t("headingHighlight")}
          />
        </h1>

        <HeroSearchBar />
      </div>
    </div>
  );
}
