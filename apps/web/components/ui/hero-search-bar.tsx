"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isSecondaryClient } from "@/lib/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { PreviewCards } from "@/components/ui/preview-cards";
import { trpc } from "@/app/_trpc/client";
import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { taskCategoryValues } from "@workspace/ui/lib/task-enum";
import { ChatContainerRoot, ChatContainerContent } from "@/components/ui/chat-container";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Markdown } from "@/components/ui/markdown";

type TabType = "jobs" | "services" | "tasks";

const MAX_PAGE_SIZE = 50;
const jobCategories = jobCategoryValues;
const serviceCategories = serviceCategoryValues;
const taskCategories = taskCategoryValues;

type JobCategory = (typeof jobCategoryValues)[number];
type ServiceCategory = (typeof serviceCategoryValues)[number];
type TaskCategory = (typeof taskCategoryValues)[number];

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const jobCategoryIcons = require("@/components/ui/config/job-filters-config").jobCategoryIcons ?? {};
const serviceCategoryIcons = require("@/components/ui/config/service-filters-config").categoryIcons ?? {};
const taskCategoryIcons = require("@/components/ui/config/task-filter-config").taskCategoryIcons ?? {};

export type HeroPreviewData = {
  items: any[];
  type: TabType;
  isLoading: boolean;
  title: string;
  hasSearched: boolean;
  isSearchMode: boolean;
  onLoadMore?: () => void;
  loadMoreLabel?: string;
};

type HeroSearchBarProps = {
  onPreviewChange?: (data: HeroPreviewData) => void;
};

function HeroSearchBarComponent({ onPreviewChange }: HeroSearchBarProps) {
  const t = useTranslations("HeroSearchBar");
  const tAll = useTranslations();
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user?.email;
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabType>("jobs");
  // Input value used for chatting; separate from the last submitted search.
  const [chatInput, setChatInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [previewPageSize, setPreviewPageSize] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState<
    JobCategory | ServiceCategory | TaskCategory | undefined
  >(undefined);
  const isSecondary = isSecondaryClient();
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi, I am Serrbi! Are you looking for a job, service, or task? Let me help you find what you need.",
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamContentRef = useRef("");

  const selectedJobCategory =
    activeTab === "jobs" ? (selectedCategory as JobCategory | undefined) : undefined;
  const selectedServiceCategory =
    activeTab === "services" ? (selectedCategory as ServiceCategory | undefined) : undefined;
  const selectedTaskCategory =
    activeTab === "tasks" ? (selectedCategory as TaskCategory | undefined) : undefined;

  // Preview queries (always on)
  const previewJobsQuery = trpc.job.getJob.useQuery(
    {
      page: 1,
      pageSize: Math.min(previewPageSize, MAX_PAGE_SIZE),
      search: undefined,
      category: selectedJobCategory,
    },
    { refetchOnWindowFocus: false },
  );
  const previewServicesQuery = trpc.service.getService.useQuery(
    {
      page: 1,
      pageSize: Math.min(previewPageSize, MAX_PAGE_SIZE),
      search: undefined,
      serviceCategory: selectedServiceCategory,
    },
    { refetchOnWindowFocus: false },
  );
  const previewTasksQuery = trpc.task.getTask.useQuery(
    {
      page: 1,
      pageSize: Math.min(previewPageSize, MAX_PAGE_SIZE),
      search: undefined,
      category: selectedTaskCategory,
    },
    { refetchOnWindowFocus: false },
  );

  const handleLoadMorePreview = () => {
    setPreviewPageSize((prev) => Math.min(prev + 12, MAX_PAGE_SIZE));
  };

  // Search result queries (manual, wider pageSize to filter top 6)
  const searchJobsQuery = trpc.job.getJob.useQuery(
    {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
      search: submittedQuery || undefined,
      category: selectedJobCategory,
    },
    { enabled: hasSearched && !!submittedQuery.trim(), refetchOnWindowFocus: false },
  );
  const searchServicesQuery = trpc.service.getService.useQuery(
    {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
      search: submittedQuery || undefined,
      serviceCategory: selectedServiceCategory,
    },
    { enabled: hasSearched && !!submittedQuery.trim(), refetchOnWindowFocus: false },
  );
  const searchTasksQuery = trpc.task.getTask.useQuery(
    {
      page: 1,
      pageSize: MAX_PAGE_SIZE,
      search: submittedQuery || undefined,
      category: selectedTaskCategory,
    },
    { enabled: hasSearched && !!submittedQuery.trim(), refetchOnWindowFocus: false },
  );

  const isSearching =
    searchJobsQuery.isFetching ||
    searchServicesQuery.isFetching ||
    searchTasksQuery.isFetching;

  const handleSearch = async (overrideQuery?: string) => {
    const effectiveQuery = (overrideQuery ?? chatInput).trim();

    if (!isLoggedIn) {
      const callback = pathname || "/";
      router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }

    // For the secondary client, keep simple redirect behavior
    if (isSecondary) {
      const searchParams = new URLSearchParams();
      if (effectiveQuery) {
        searchParams.set("search", effectiveQuery);
      }
      const routes: Record<TabType, string> = {
        jobs: `/jobs?${searchParams.toString()}`,
        services: `/services?${searchParams.toString()}`,
        tasks: `/tasks?${searchParams.toString()}`,
      };
      const route = routes[activeTab] ?? routes.jobs;
      window.location.href = route;
      return;
    }

    if (!effectiveQuery) {
      setHasSearched(false);
      setSubmittedQuery("");
      return;
    }

    // Expand chat and add user message
    setChatExpanded(true);
    const userMessageId = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        content: effectiveQuery,
      },
    ]);

    // Persist the submitted query for preview results, but clear the input box for chat UX.
    setSubmittedQuery(effectiveQuery);
    setChatInput("");

    // Start streaming assistant response
    streamAssistantResponse(userMessageId + 1, effectiveQuery);

    setHasSearched(true);
  };

  const streamAssistantResponse = (messageId: number, userQuery: string) => {
    if (isStreaming) return;

    setIsStreaming(true);
    
    // Static response for testing - customize based on activeTab
    const responses: Record<TabType, string> = {
      jobs: `Great! I'm searching for jobs matching "${userQuery}". I found several opportunities that might interest you. Let me show you the results below. You can filter by category to narrow down your search.`,
      services: `Perfect! I'm looking for services related to "${userQuery}". I've found some great service providers that match your needs. Check out the results below and feel free to filter by category.`,
      tasks: `Excellent! I'm searching for tasks matching "${userQuery}". I've found several tasks that you might be interested in. Take a look at the results below and use the category filters to refine your search.`,
    };

    const fullResponse = responses[activeTab];

    // Add empty assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "assistant",
        content: "",
      },
    ]);

    let charIndex = 0;
    streamContentRef.current = "";

    streamIntervalRef.current = setInterval(() => {
      if (charIndex < fullResponse.length) {
        streamContentRef.current += fullResponse[charIndex];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: streamContentRef.current }
              : msg
          )
        );
        charIndex++;
      } else {
        clearInterval(streamIntervalRef.current!);
        setIsStreaming(false);
      }
    }, 20);
  };

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  const tabLabels = {
    jobs: t("tabs.jobs"),
    services: t("tabs.services"),
    tasks: t("tabs.tasks"),
  };

  const categoryList = useMemo(() => {
    if (activeTab === "jobs") return jobCategories;
    if (activeTab === "services") return serviceCategories;
    return taskCategories;
  }, [activeTab]);

  const previewItems = useMemo(() => {
    if (activeTab === "jobs") {
      return { items: previewJobsQuery.data?.items ?? [], loading: previewJobsQuery.isLoading };
    }
    if (activeTab === "services") {
      return { items: previewServicesQuery.data?.items ?? [], loading: previewServicesQuery.isLoading };
    }
    return { items: previewTasksQuery.data?.items ?? [], loading: previewTasksQuery.isLoading };
  }, [
    activeTab,
    previewJobsQuery.data?.items,
    previewJobsQuery.isLoading,
    previewServicesQuery.data?.items,
    previewServicesQuery.isLoading,
    previewTasksQuery.data?.items,
    previewTasksQuery.isLoading,
  ]);

  useEffect(() => {
    if (!onPreviewChange) return;

    const isSearchMode = hasSearched && !!submittedQuery.trim();
    const loading = isSearchMode
      ? activeTab === "jobs"
        ? searchJobsQuery.isFetching
        : activeTab === "services"
          ? searchServicesQuery.isFetching
          : searchTasksQuery.isFetching
      : previewItems.loading;

    const searchItems =
      activeTab === "jobs"
        ? (searchJobsQuery.data?.items ?? []).slice(0, 6)
        : activeTab === "services"
          ? (searchServicesQuery.data?.items ?? []).slice(0, 6)
          : (searchTasksQuery.data?.items ?? []).slice(0, 6);

    onPreviewChange({
      items: isSearchMode ? searchItems : previewItems.items,
      type: activeTab,
      isLoading: loading,
      title:
        activeTab === "jobs"
          ? t("jobsHint")
          : activeTab === "services"
            ? t("servicesHint")
            : t("tasksHint"),
      hasSearched,
      isSearchMode,
      onLoadMore: isSearchMode ? undefined : handleLoadMorePreview,
      loadMoreLabel: t("loadMore"),
    });
  }, [
    hasSearched,
    submittedQuery,
    activeTab,
    onPreviewChange,
    t,
    previewItems,
    searchJobsQuery.data?.items,
    searchServicesQuery.data?.items,
    searchTasksQuery.data?.items,
    searchJobsQuery.isFetching,
    searchServicesQuery.isFetching,
    searchTasksQuery.isFetching,
  ]);

  return (
    <div className="-mx-4 w-screen max-w-none sm:mx-0 md:max-w-4xl">
      {/* Search Content - Chat interface */}
      <div className="px-4 md:px-6 md:pb-0">
        <div className="flex flex-col gap-4 mx-auto w-full">
          {/* Chat Container */}
          <div
            className={`relative w-full bg-white rounded-2xl transition-all duration-300 flex flex-col ${
              chatExpanded ? "h-[min(72svh,720px)]" : "min-h-[120px]"
            }`}
          >
            {/* Chat Messages Area */}
            {chatExpanded && (
              <ChatContainerRoot className="min-h-0 flex-1 px-3 pt-3">
                <ChatContainerContent className="space-y-3">
                  {messages.map((message) => {
                    const isAssistant = message.role === "assistant";

                    return (
                      <Message
                        key={message.id}
                        className={
                          message.role === "user" ? "justify-end" : "justify-start"
                        }
                      >
                        {isAssistant && (
                          <MessageAvatar
                            fallback="S"
                            className="bg-slate-900 text-white"
                          />
                        )}
                        {isAssistant ? (
                          <div className="inline-block w-fit max-w-[85%] sm:max-w-[75%] rounded-lg bg-slate-50 px-4 py-2.5 text-slate-900">
                            <Markdown>{message.content}</Markdown>
                          </div>
                        ) : (
                          <MessageContent className="w-fit max-w-[85%] sm:max-w-[75%] bg-slate-900 text-white">
                            {message.content}
                          </MessageContent>
                        )}
                      </Message>
                    );
                  })}
                </ChatContainerContent>
              </ChatContainerRoot>
            )}

            {/* Input Area at Bottom */}
            <div className="p-3">
              <div className="flex items-center">
                <Input
                  placeholder={t("placeholder")}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) {
                      e.preventDefault();
                      void handleSearch();
                    }
                  }}
                  className="flex-1 px-0 text-sm text-gray-900 bg-transparent border-none shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex gap-2 justify-end items-center mt-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={activeTab}
                    onValueChange={(value) => {
                      setActiveTab(value as TabType);
                      setHasSearched(false);
                      setSubmittedQuery("");
                      setSelectedCategory(undefined);
                      setPreviewPageSize(12);
                    }}
                  >
                    <SelectTrigger className="h-8 min-w-[120px] px-3 text-sm">
                      <SelectValue placeholder={tabLabels[activeTab]} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jobs">{tabLabels.jobs}</SelectItem>
                      <SelectItem value="services">{tabLabels.services}</SelectItem>
                      <SelectItem value="tasks">{tabLabels.tasks}</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => void handleSearch()}
                    disabled={isSearching || isStreaming}
                    className="flex justify-center items-center w-12 h-8 rounded-lg border border-gray-200 disabled:opacity-60"
                  >
                    <Image 
                      src="/icons/arrow.svg" 
                      alt="Send" 
                      width={20} 
                      height={20}
                      className={dir === 'rtl' ? 'rotate-180' : ''}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Scroll categories left"
              className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              onClick={() => categoryScrollRef.current?.scrollBy({ left: -180, behavior: "smooth" })}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div
              ref={categoryScrollRef}
              className="flex overflow-x-auto overflow-y-hidden no-scrollbar gap-2 py-1 px-1 w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {categoryList.map((option: string) => {
                const icons =
                  activeTab === "jobs"
                    ? jobCategoryIcons
                    : activeTab === "services"
                      ? serviceCategoryIcons
                      : taskCategoryIcons;
                const labelKeyPrefix =
                  activeTab === "jobs"
                    ? "Enums.JobCategory."
                    : activeTab === "services"
                      ? "Enums.ServiceCategory."
                      : "Enums.TaskCategory.";
                const IconComponent = icons[option as keyof typeof icons];
                const isSelected = selectedCategory === option;
                return (
                  <button
                    key={option}
                    onClick={() => {
                      const nextCategory = isSelected ? undefined : (option as JobCategory | ServiceCategory | TaskCategory);
                      setSelectedCategory(nextCategory);
                      setPreviewPageSize(12);

                      // If user already searched, keep search mode (query hooks will refetch automatically).
                      const hasQuery = !!submittedQuery.trim();
                      setHasSearched(hasQuery);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition whitespace-nowrap ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                    {tAll((labelKeyPrefix + option) as any)}
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Scroll categories right"
              className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              onClick={() => categoryScrollRef.current?.scrollBy({ left: 180, behavior: "smooth" })}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
                    </div>

        </div>
      </div>
      {isSecondary && (
      <div className="px-6 pb-4">
          <div className="flex justify-center">
            <Link href="/jobs">
              <Button className="px-6 h-10 text-white bg-black rounded-full hover:bg-gray-800">
                {t("browseJobs")}
              </Button>
            </Link>
          </div>
          </div>
        )}
    </div>
  );
}

type HeroSearchBarComponentType = typeof HeroSearchBarComponent & {
  Preview: typeof PreviewCards;
};

const HeroSearchBar = Object.assign(HeroSearchBarComponent, {
  Preview: PreviewCards,
}) as HeroSearchBarComponentType;

export { HeroSearchBar };
