"use client";

import { HeroSearchBar } from "@/components/ui/hero-search-bar";
import { GradientText } from "@workspace/ui/components/ui/shadcn-io/gradient-text";

import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from "@workspace/ui/components/ui/shadcn-io/announcement";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Hero() {
  const t = useTranslations("Hero");
  // avatars removed on mobile for better fit

  return (
    <div className="flex overflow-hidden relative flex-col gap-16 px-8 text-center">
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
