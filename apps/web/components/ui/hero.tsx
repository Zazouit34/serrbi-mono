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
            ? "h-[calc(100svh-7.5rem)] justify-start gap-3 pt-3 pb-2 md:h-[calc(100svh-5rem)] md:py-3"
            : "justify-start gap-6 pt-10 pb-4 md:min-h-0 md:justify-center md:py-28 lg:py-32"
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
        <div className="mt-0 w-full px-4 md:mt-3 md:px-0">
          <HeroSearchBar.Preview {...previewData} />
        </div>
      )}
    </div>
  );
}
