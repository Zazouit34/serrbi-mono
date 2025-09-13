"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Briefcase, Wrench, CheckSquare, MapPin, Search } from "lucide-react";

type TabType = "jobs" | "services" | "tasks";

export function HeroSearchBar() {
  const [activeTab, setActiveTab] = useState<TabType>("jobs");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    // Navigate to the appropriate listing page with search query
    const searchParams = new URLSearchParams();
    if (searchQuery) searchParams.set("search", searchQuery);
    
    const routes = {
      jobs: `/jobs?${searchParams.toString()}`,
      services: `/services?${searchParams.toString()}`,
      tasks: `/tasks?${searchParams.toString()}`
    };
    
    window.location.href = routes[activeTab];
  };

  const tabIcons = {
    jobs: Briefcase,
    services: Wrench,
    tasks: CheckSquare,
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="overflow-hidden bg-white rounded-2xl shadow-lg">
        {/* Tabs Header - Compact on left */}
        <div className="px-6 pt-4 pb-2">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
            <TabsList className="bg-gray-50 w-fit">
              {(["jobs", "services", "tasks"] as TabType[]).map((tab) => {
                const Icon = tabIcons[tab];
                return (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="flex items-center gap-2 text-gray-600 data-[state=active]:text-[#FF040E] data-[state=active]:bg-white"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium capitalize">{tab}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Search Content */}
        <div className="px-6 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-0 sm:relative">
            {/* Search Input */}
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 z-10 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 pr-4 sm:pr-24 h-10 text-base border-gray-200 focus:border-[#FF040E] focus:ring-[#FF040E] rounded-full"
              />
            </div>

            {/* Search Button - Below on mobile, inside on desktop */}
            <Button
              onClick={handleSearch}
              className="w-fit self-start h-8 px-4 text-sm font-medium text-white bg-[#FF040E] hover:bg-[#E0030C] focus:ring-[#FF040E] rounded-full sm:absolute sm:right-1 sm:top-1/2 sm:transform sm:-translate-y-1/2"
            >
              <Search className="mr-1 size-4" />
              <span className="pr-2">Search</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}