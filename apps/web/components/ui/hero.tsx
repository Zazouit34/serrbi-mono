"use client";

import { useState } from "react";
import { HeroSearchBar, type HeroPreviewData } from "@/components/ui/hero-search-bar";

import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from "@workspace/ui/components/ui/shadcn-io/announcement";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Hero() {
  const t = useTranslations("Hero");
  const [previewData, setPreviewData] = useState<HeroPreviewData>({
    items: [],
    type: "jobs",
    isLoading: false,
    title: "",
    hasSearched: false,
    isSearchMode: false,
  });
  // avatars removed on mobile for better fit

  return (
    <div className="flex overflow-hidden relative flex-col gap-16 text-center">
      <div className="flex relative z-10 flex-col gap-6 justify-center items-center">
        <Announcement className="px-3 py-2 text-[12px] md:text-[14px] w-auto rounded-full inline-flex items-center gap-2">
          <AnnouncementTag className="ml-1 font-semibold text-white bg-gradient-to-r from-red-500 via-pink-500 to-rose-500">
            {t("announcementNew")}
          </AnnouncementTag>
          <AnnouncementTitle>
            <span className="block font-semibold text-foreground/70 md:hidden">
              {t("announcementTitleShort")}
            </span>
            <span className="hidden font-semibold md:inline text-foreground/70">
              {t("announcementTitle")}
            </span>
            <ArrowUpRight className="size-4 text-[#ff040e]" />
          </AnnouncementTitle>
        </Announcement>
        <h1 className="mb-0 text-balance font-semibold text-[28px] md:text-[36px] leading-tight">
          {t("headingLine1")}
        </h1>

        <HeroSearchBar onPreviewChange={setPreviewData} />
        <div className="mt-4 w-full">
          <HeroSearchBar.Preview {...previewData} />
        </div>
      </div>
    </div>
  );
}
