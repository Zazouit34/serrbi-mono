"use client";

import { useState } from "react";
import { HeroSearchBar, type HeroPreviewData } from "@/components/ui/hero-search-bar";

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
  const [chatExpanded, setChatExpanded] = useState(false);
  // avatars removed on mobile for better UX

  return (
    <div className="flex flex-col">
      <div
        className={`mx-auto flex w-full flex-col items-center px-4 md:px-0 ${
          chatExpanded
            ? "h-[100svh] justify-start gap-4 pt-8 pb-6 md:py-6"
            : "min-h-[100svh] justify-start gap-6 pt-12 pb-16 md:min-h-0 md:justify-center md:py-28 lg:py-32"
        }`}
      >
        {!chatExpanded && (
          <h2 className="font-libre-baskerville mb-0 text-balance text-center text-[28px] md:text-[40px] leading-tight">
            {t("headingLine1")}
          </h2>
        )}

        <div className={chatExpanded ? "w-full flex-1 min-h-0" : "w-full"}>
          <HeroSearchBar
            onPreviewChange={setPreviewData}
            onChatExpandedChange={setChatExpanded}
          />
        </div>
      </div>

      {!chatExpanded && (
        <div className="mt-3 w-full">
          <HeroSearchBar.Preview {...previewData} />
        </div>
      )}
    </div>
  );
}
