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
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";

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
  content?: string;
  results?: {
    key: string;
    query: string;
    type: TabType;
    items: any[];
    isLoading: boolean;
  };
  selectPrompt?: boolean;
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
  onChatExpandedChange?: (expanded: boolean) => void;
};

function HeroSearchBarComponent({ onPreviewChange, onChatExpandedChange }: HeroSearchBarProps) {
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"initial" | "choice" | "input" | "done">("initial");
  const [userChoice, setUserChoice] = useState<TabType | null>(null);
  const [placeholder, setPlaceholder] = useState("");
  const nextMessageIdRef = useRef(1);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamContentRef = useRef("");
  const placeholderIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onChatExpandedChange?.(chatExpanded);
  }, [chatExpanded, onChatExpandedChange]);

  // One-time streaming placeholder effect
  useEffect(() => {
    const placeholderText = t.raw("placeholderStreaming") as string;
    if (typeof placeholderText !== "string" || !placeholderText) {
      setPlaceholder(t("placeholder"));
      return;
    }

    let charIndex = 0;

    const streamPlaceholder = () => {
      if (charIndex < placeholderText.length) {
        setPlaceholder(placeholderText.slice(0, charIndex + 1));
        charIndex++;
      } else {
        if (placeholderIntervalRef.current) {
          clearInterval(placeholderIntervalRef.current);
        }
      }
    };

    placeholderIntervalRef.current = setInterval(streamPlaceholder, 50);

    return () => {
      if (placeholderIntervalRef.current) {
        clearInterval(placeholderIntervalRef.current);
      }
    };
  }, [t]);

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

  const topSearchItems = useMemo(() => {
    if (!hasSearched || !submittedQuery.trim()) return [];
    if (activeTab === "jobs") return (searchJobsQuery.data?.items ?? []).slice(0, 6);
    if (activeTab === "services") return (searchServicesQuery.data?.items ?? []).slice(0, 6);
    return (searchTasksQuery.data?.items ?? []).slice(0, 6);
  }, [
    hasSearched,
    submittedQuery,
    activeTab,
    searchJobsQuery.data?.items,
    searchServicesQuery.data?.items,
    searchTasksQuery.data?.items,
  ]);

  const topSearchLoading = useMemo(() => {
    if (!hasSearched || !submittedQuery.trim()) return false;
    if (activeTab === "jobs") return searchJobsQuery.isFetching;
    if (activeTab === "services") return searchServicesQuery.isFetching;
    return searchTasksQuery.isFetching;
  }, [
    hasSearched,
    submittedQuery,
    activeTab,
    searchJobsQuery.isFetching,
    searchServicesQuery.isFetching,
    searchTasksQuery.isFetching,
  ]);

  const submittedResultsKey = useMemo(() => {
    if (!submittedQuery.trim()) return "";
    return `${activeTab}|${submittedQuery.trim()}`;
  }, [activeTab, submittedQuery]);

  useEffect(() => {
    if (!hasSearched || !submittedQuery.trim()) return;
    if (!submittedResultsKey) return;

    setMessages((prev) =>
      prev.map((msg) => {
        if (!msg.results) return msg;
        if (msg.results.key !== submittedResultsKey) return msg;
        return {
          ...msg,
          results: {
            ...msg.results,
            items: topSearchItems,
            isLoading: topSearchLoading,
            type: activeTab,
            query: submittedQuery,
          },
        };
      }),
    );
  }, [
    hasSearched,
    submittedQuery,
    submittedResultsKey,
    activeTab,
    topSearchItems,
    topSearchLoading,
  ]);

  const handleChoiceSelection = (choice: TabType) => {
    setUserChoice(choice);
    setActiveTab(choice);
    setOnboardingStep("input");

    // Add user's choice as a message
    const choiceLabels: Record<TabType, string> = {
      jobs: t("onboarding.choiceJob"),
      services: t("onboarding.choiceService"),
      tasks: t("onboarding.choiceTask"),
    };

    const userChoiceId = nextMessageIdRef.current++;
    const confirmId = nextMessageIdRef.current++;

    setMessages((prev) => [
      ...prev,
      { id: userChoiceId, role: "user", content: choiceLabels[choice] },
      { id: confirmId, role: "assistant", content: "" },
    ]);

    // Stream confirmation message
    const confirmMessages: Record<TabType, string> = {
      jobs: t("onboarding.confirmChoiceJob"),
      services: t("onboarding.confirmChoiceService"),
      tasks: t("onboarding.confirmChoiceTask"),
    };

    let charIndex = 0;
    const confirmMsg = confirmMessages[choice];
    streamContentRef.current = "";

    streamIntervalRef.current = setInterval(() => {
      if (charIndex < confirmMsg.length) {
        streamContentRef.current += confirmMsg[charIndex];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === confirmId ? { ...msg, content: streamContentRef.current } : msg
          )
        );
        charIndex++;
      } else {
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
        }
      }
    }, 20);
  };

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

    // If this is the first user interaction, show onboarding
    if (onboardingStep === "initial") {
      setChatExpanded(true);
      setOnboardingStep("choice");

      const userMessageId = nextMessageIdRef.current++;
      const greetingId = nextMessageIdRef.current++;

      setMessages([
        { id: userMessageId, role: "user", content: effectiveQuery },
        { id: greetingId, role: "assistant", content: "", selectPrompt: true },
      ]);

      setChatInput("");

      // Stream the greeting
      let charIndex = 0;
      const greeting = t("onboarding.greeting");
      streamContentRef.current = "";

      streamIntervalRef.current = setInterval(() => {
        if (charIndex < greeting.length) {
          streamContentRef.current += greeting[charIndex];
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === greetingId ? { ...msg, content: streamContentRef.current } : msg
            )
          );
          charIndex++;
        } else {
          if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
          }
        }
      }, 20);

      return;
    }

    // Now do the actual search (after onboarding)
    setOnboardingStep("done");
    setChatExpanded(true);

    const userMessageId = nextMessageIdRef.current++;
    const assistantMessageId = nextMessageIdRef.current++;
    const resultsMessageId = nextMessageIdRef.current++;
    const resultsKey = `${activeTab}|${effectiveQuery}`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: effectiveQuery },
      { id: assistantMessageId, role: "assistant", content: "" },
      {
        id: resultsMessageId,
        role: "assistant",
        results: {
          key: resultsKey,
          query: effectiveQuery,
          type: activeTab,
          items: [],
          isLoading: true,
        },
      },
    ]);

    // Persist the submitted query for preview results, but clear the input box for chat UX.
    setSubmittedQuery(effectiveQuery);
    setChatInput("");

    // Start streaming assistant response
    streamAssistantResponse(assistantMessageId, effectiveQuery);

    setHasSearched(true);
  };

  const streamAssistantResponse = (messageId: number, userQuery: string) => {
    if (isStreaming) return;

    setIsStreaming(true);
    
    // Static response for testing - customize based on activeTab
    const responses: Record<TabType, string> = {
      jobs: `Great! I'm searching for jobs matching "${userQuery}". Let me show you the results below.`,
      services: `Perfect! I'm looking for services related to "${userQuery}". Let me show you the results below.`,
      tasks: `Excellent! I'm searching for tasks matching "${userQuery}". Let me show you the results below.`,
    };

    const fullResponse = responses[activeTab];

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

    onPreviewChange({
      items: previewItems.items,
      type: activeTab,
      isLoading: previewItems.loading,
      title:
        activeTab === "jobs"
          ? t("jobsHint")
          : activeTab === "services"
            ? t("servicesHint")
            : t("tasksHint"),
      hasSearched: false,
      isSearchMode: false,
      onLoadMore: handleLoadMorePreview,
      loadMoreLabel: t("loadMore"),
    });
  }, [
    activeTab,
    onPreviewChange,
    t,
    previewItems,
  ]);

  return (
    <div className={`mx-auto w-full max-w-4xl ${chatExpanded ? "h-full" : ""}`}>
      {/* Search Content - Chat interface */}
      <div className={`px-4 md:px-6 md:pb-0 ${chatExpanded ? "h-full" : ""}`}>
        <div className={`flex flex-col gap-4 mx-auto w-full ${chatExpanded ? "h-full" : ""}`}>
          {/* Chat Container */}
          <div
            className={`relative w-full bg-white rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${
              chatExpanded ? "flex-1 min-h-0" : "min-h-[120px]"
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
                          message.selectPrompt ? (
                            <div className="inline-block w-fit max-w-[85%] sm:max-w-[75%] rounded-lg bg-slate-50 px-4 py-2.5 text-slate-900">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Markdown>{message.content ?? ""}</Markdown>
                                <Select onValueChange={(value) => handleChoiceSelection(value as TabType)}>
                                  <SelectTrigger className="h-8 min-w-[120px] px-3 text-sm">
                                    <SelectValue placeholder={t("tabs.jobs")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="jobs">{t("onboarding.choiceJob")}</SelectItem>
                                    <SelectItem value="services">{t("onboarding.choiceService")}</SelectItem>
                                    <SelectItem value="tasks">{t("onboarding.choiceTask")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : message.results ? (
                            <div className="w-full max-w-[85%] sm:max-w-[75%] rounded-lg bg-slate-50 px-4 py-2.5 text-slate-900">
                              <div className="text-sm font-medium">
                                Results for “{message.results.query}”
                              </div>
                              <div className="mt-1 text-sm text-slate-600">
                                {message.results.isLoading
                                  ? "Searching…"
                                  : message.results.items.length === 0
                                    ? "No results found. Try adjusting your search."
                                    : `Found ${message.results.items.length} ${message.results.items.length === 1 ? "result" : "results"}:`}
                              </div>
                              {!message.results.isLoading && message.results.items.length > 0 && (
                                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                                  {message.results.items.map((item: any) => {
                                    if (message.results?.type === "jobs") {
                                      return (
                                        <JobCard
                                          key={item.id}
                                          className="h-full"
                                          job={item}
                                          compact
                                        />
                                      );
                                    }
                                    if (message.results?.type === "services") {
                                      return (
                                        <Link
                                          key={item.id}
                                          href={`/services?serviceCategory=${encodeURIComponent(
                                            item.serviceCategory ?? "",
                                          )}`}
                                        >
                                          <ServiceCard service={item} className="h-full" />
                                        </Link>
                                      );
                                    }
                                    return (
                                      <TaskCard
                                        key={item.id}
                                        task={item}
                                        className="h-full"
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="inline-block w-fit max-w-[85%] sm:max-w-[75%] rounded-lg bg-slate-50 px-4 py-2.5 text-slate-900">
                              <Markdown>{message.content ?? ""}</Markdown>
                            </div>
                          )
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
            <div className="sticky bottom-0 z-10 bg-white p-3">
              <div className="rounded-2xl border border-gray-200 shadow-sm bg-white p-3">
                <div className="flex items-center">
                  <Input
                    placeholder={placeholder || t("placeholder")}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && chatInput.trim() && onboardingStep !== "choice") {
                        e.preventDefault();
                        void handleSearch();
                      }
                    }}
                    className="flex-1 px-0 text-sm text-gray-900 bg-transparent border-none shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="flex gap-2 justify-end items-center mt-3">
                  <div className="flex items-center gap-2">
                    {onboardingStep === "done" && (
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
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSearch()}
                      disabled={isSearching || isStreaming || onboardingStep === "choice"}
                      className="flex justify-center items-center w-12 h-8 rounded-lg border border-gray-200 disabled:opacity-60"
                    >
                      <Image
                        src="/icons/arrow.svg"
                        alt="Send"
                        width={20}
                        height={20}
                        className={dir === "rtl" ? "rotate-180" : ""}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category filter */}
          {!chatExpanded && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Scroll categories left"
                className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                onClick={() =>
                  categoryScrollRef.current?.scrollBy({ left: -180, behavior: "smooth" })
                }
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
                        const nextCategory = isSelected
                          ? undefined
                          : (option as JobCategory | ServiceCategory | TaskCategory);
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
                onClick={() =>
                  categoryScrollRef.current?.scrollBy({ left: 180, behavior: "smooth" })
                }
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

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
