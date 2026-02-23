"use client";

import { useEffect, useMemo, useState } from "react";
import { HeroSearchBar, type HeroPreviewData } from "@/components/ui/hero-search-bar";
import { LettersPullUp } from "@/components/ui/letters-pull-up";

import { useTranslations } from "next-intl";

export default function Hero() {
  const t = useTranslations("Hero");
  const rotatingHeadings = useMemo(
    () => [t("headingLine1"), t("headingLine2"), t("headingLine3"), t("headingLine4")].filter(Boolean),
    [t],
  );
  const [previewData, setPreviewData] = useState<HeroPreviewData>({
    items: [],
    type: "jobs",
    isLoading: false,
    title: "",
    hasSearched: false,
    isSearchMode: false,
  });
  const [chatExpanded, setChatExpanded] = useState(false);
  const [headingIndex, setHeadingIndex] = useState(0);
  // avatars removed on mobile for better UX

  useEffect(() => {
    setHeadingIndex(0);
  }, [rotatingHeadings.length]);

  useEffect(() => {
    if (chatExpanded || rotatingHeadings.length <= 1) return;
    const interval = setInterval(() => {
      setHeadingIndex((prev) => (prev + 1) % rotatingHeadings.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [chatExpanded, rotatingHeadings.length]);

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
            <LettersPullUp
              key={`${headingIndex}-${rotatingHeadings[headingIndex] ?? ""}`}
              text={rotatingHeadings[headingIndex] ?? t("headingLine1")}
            />
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
