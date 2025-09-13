"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Search } from "lucide-react";
import { FaGoogle, FaAws, FaMicrosoft, FaLinkedin } from "react-icons/fa";

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

  const tabLabels = {
    jobs: "Browse jobs",
    services: "Find services", 
    tasks: "Complete tasks"
  };

  const companyIcons = [
    { icon: FaGoogle, name: "Google" },
    { icon: FaAws, name: "AWS" },
    { icon: FaMicrosoft, name: "Microsoft" },
    { icon: FaLinkedin, name: "LinkedIn" }
  ];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="overflow-hidden bg-white rounded-2xl">
        {/* Tabs Header - Full width to match search content */}
        <div className="px-6 pt-4 pb-2">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
            <TabsList className="justify-start w-full h-12 bg-white rounded-full border border-gray-200">
              {(["jobs", "services", "tasks"] as TabType[]).map((tab) => {
                return (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="text-gray-400 data-[state=active]:text-[#000000] data-[state=active]:border-gray-200 data-[state=active]:bg-transparent rounded-full"
                  >
                    <span className="font-medium">{tabLabels[tab]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Search Content - Increased height */}
        <div className="px-6 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-0 sm:relative">
            {/* Search Input */}
            <div className="relative flex-1">
              <Input
                placeholder="Search by role, skills, or keywords.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pr-4 pl-12 h-12 text-base rounded-full border-gray-200 sm:pr-24 focus:!border-none focus:!ring-1 focus:!ring-black"
              />
            </div>

            {/* Search Button - Below on mobile, inside on desktop */}
            <Button
              onClick={handleSearch}
              className="self-start px-4 h-10 text-sm font-medium text-white bg-black rounded-full w-fit hover:bg-gray-800 focus:ring-black sm:absolute sm:right-1 sm:top-1/2 sm:transform sm:-translate-y-1/2"
            >
              <Search className="mr-1 size-4" />
              <span className="pr-2">Search</span>
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