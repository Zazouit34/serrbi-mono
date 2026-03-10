"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
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

  useEffect(() => {
    setHeadingIndex(0);
  }, [rotatingHeadings.length]);

  useEffect(() => {
    if (chatExpanded || rotatingHeadings.length <= 1) return;
    const interval = setInterval(() => {
      setHeadingIndex((prev) => (prev + 1) % rotatingHeadings.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [chatExpanded, rotatingHeadings.length]);

  useEffect(() => {
    if (!chatExpanded) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [chatExpanded]);

  return (
    <div className={cn("flex flex-col", chatExpanded && "-mx-4 md:mx-0")}>
      <div
        className={cn(
          "mx-auto flex w-full flex-col items-center",
          chatExpanded
            ? "h-[calc(100dvh-11rem)] justify-start gap-2 px-2 pt-1 pb-1 md:h-[calc(100dvh-5rem)] md:px-0 md:py-3"
            : "justify-start gap-5 pt-12 pb-4 md:min-h-0 md:justify-center md:py-28 lg:py-32",
        )}
      >
        {!chatExpanded && (
          <h2 className="font-libre-baskerville mb-0 text-balance text-center text-[26px] leading-tight md:text-[40px]">
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
        <div className="mt-0 w-full md:mt-3">
          <HeroSearchBar.Preview {...previewData} />
        </div>
      )}
    </div>
  );
}
