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
  // avatars removed on mobile for better fit

  return (
    <div className="flex flex-col text-center">
      <div
        className={`flex flex-col items-center mx-auto w-full ${
          chatExpanded
            ? "justify-start gap-4 h-[100svh] px-4 py-6"
            : "justify-center gap-6 min-h-[100svh] md:min-h-0 px-4 py-24 md:py-28 lg:py-32"
        }`}
      >
        {!chatExpanded && (
          <h2 className="mb-0 text-balance font-semibold text-[28px] md:text-[36px] leading-tight">
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
