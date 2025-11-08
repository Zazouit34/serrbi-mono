"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Search, Briefcase, Wrench, ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { FaGoogle, FaAws, FaMicrosoft, FaLinkedin } from "react-icons/fa";
import { isSecondaryClient } from "@/lib/domain";


type TabType = "jobs" | "services" | "tasks";

export function HeroSearchBar() {
  const t = useTranslations("HeroSearchBar");
  const [activeTab, setActiveTab] = useState<TabType>("jobs");
  const [searchQuery, setSearchQuery] = useState("");
  const isSecondary = isSecondaryClient();

  const handleSearch = () => {
    // Navigate to the appropriate listing page with search query
    const searchParams = new URLSearchParams();
    if (searchQuery) {
      searchParams.set("search", searchQuery);
    }
    

    const routes = {
      jobs: `/jobs?${searchParams.toString()}`,
      services: `/services?${searchParams.toString()}`,
      tasks: `/tasks?${searchParams.toString()}`,
    };

    const route = isSecondary ? `/jobs?${searchParams.toString()}` : routes[activeTab];
    window.location.href = route;
  };

  const tabLabels = {
    jobs: t("tabs.jobs"),
    services: t("tabs.services"),
    tasks: t("tabs.tasks"),
  } as const;

  const tabIcons: Record<TabType, any> = {
    jobs: Briefcase,
    services: Wrench,
    tasks: ClipboardList,
  };

  const companyIcons = [
    { icon: FaGoogle, name: "Google" },
    { icon: FaAws, name: "AWS" },
    { icon: FaMicrosoft, name: "Microsoft" },
    { icon: FaLinkedin, name: "LinkedIn" },
  ];

  return (
    <div
      className="-mx-4 w-screen max-w-none sm:mx-0 md:max-w-2xl md:mx-auto"
      
    >
      <div className="overflow-hidden bg-white rounded-2xl">
        {/* Tabs Header - Full width to match search content */}
        <div className="px-4 pt-3 pb-2 md:px-6 md:pt-4">
          {!isSecondary && (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as TabType)}
            >
              <div className="overflow-x-auto no-scrollbar">
                <TabsList className="flex-nowrap justify-start w-full h-10 whitespace-nowrap bg-white rounded-full border border-gray-200 md:h-12">
                  {(["jobs", "services", "tasks"] as TabType[]).map((tab) => {
                    const Icon = tabIcons[tab];
                    return (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="gap-2 px-3 text-gray-400 data-[state=active]:text-[#000000] data-[state=active]:border-gray-200 data-[state=active]:bg-transparent rounded-full text-xs md:text-base min-w-[84px] md:min-w-0"
                      >
                        <Icon className="size-4 md:size-5" />
                        <span className="hidden font-medium md:inline">
                          {tabLabels[tab]}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </Tabs>
          )}
        </div>

        {/* Search Content - Increased height */}
        <div className="px-4 pb-3 md:px-6 md:pb-4">
          <div className="relative">
            {/* Search Input */}
            <div className="relative flex-1">
              <Input
                placeholder={t("placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pr-12 pl-8 h-11 text-sm rounded-full border-gray-200 md:h-12 md:text-base md:pr-24 focus:!border-none focus:!ring-1 focus:!ring-black"
              />
            </div>

            {/* Search Button - Always inside on both mobile and desktop */}
            <Button
              onClick={handleSearch}
              className="absolute right-1 top-1/2 px-2 h-9 text-sm font-medium text-white bg-black rounded-full transform -translate-y-1/2 w-fit hover:bg-gray-800 focus:ring-black md:px-4 md:h-10"
            >
              <Search className="size-4" />
              <span className="hidden md:inline md:ml-1 md:pr-2">{t("search")}</span>
            </Button>
          </div>
        </div>

        {/* Company Icons Footer */}
        <div className="px-6 pb-4">
          <div className="flex gap-8 justify-center items-center pt-2">
            {companyIcons.map(({ icon: Icon, name }) => (
              <div key={name} className="flex justify-center items-center">
                <Icon
                  className="w-6 h-6 transition-opacity hover:opacity-70"
                  title={name}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
