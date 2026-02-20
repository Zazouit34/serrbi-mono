"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { ChevronDown, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isSecondaryClient } from "@/lib/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";

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
import { ThinkingBar } from "@/components/ui/thinking-bar";
import { ActionButton } from "@/components/ui/action-button";

type TabType = "jobs" | "services" | "tasks";

const MAX_PAGE_SIZE = 50;
const SEARCH_PAGE_SIZE = 3;

type JobCategory = (typeof jobCategoryValues)[number];
type ServiceCategory = (typeof serviceCategoryValues)[number];
type TaskCategory = (typeof taskCategoryValues)[number];

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content?: string;
  thinking?: boolean;
  results?: {
    key: string;
    query: string;
    type: TabType;
    items: any[];
    isLoading: boolean;
  };
  selectPrompt?: boolean;
};

export type HeroPreviewData = {
  items: any[];
  type: TabType;
  isLoading: boolean;
  title: string;
  hasSearched: boolean;
  isSearchMode: boolean;
  selectedCategory?: string;
  onTypeChange?: (type: TabType) => void;
  onCategoryChange?: (category?: string) => void;
  onLoadMore?: () => void;
  loadMoreLabel?: string;
};

type HeroSearchBarProps = {
  onPreviewChange?: (data: HeroPreviewData) => void;
  onChatExpandedChange?: (expanded: boolean) => void;
};

function HeroSearchBarComponent({ onPreviewChange, onChatExpandedChange }: HeroSearchBarProps) {
  const t = useTranslations("HeroSearchBar");
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
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"initial" | "choice" | "input" | "done">("initial");
  const [userChoice, setUserChoice] = useState<TabType | null>(null);
  const [placeholder, setPlaceholder] = useState("");
  const [choicePopoverOpen, setChoicePopoverOpen] = useState(false);
  const [pendingAiReply, setPendingAiReply] = useState<{
    messageId: number;
    query: string;
    tab: TabType;
    resultsKey: string;
    locale: string;
  } | null>(null);
  const nextMessageIdRef = useRef(1);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamContentRef = useRef("");
  const placeholderIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  const clearStreamTimers = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
  };

  const streamAssistantText = (messageId: number, text: string, delayMs = 650) => {
    clearStreamTimers();

    // show "thinking" briefly before streaming
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, thinking: true, content: "" } : m)),
    );

    streamTimeoutRef.current = setTimeout(() => {
      let charIndex = 0;
      streamContentRef.current = "";

      streamIntervalRef.current = setInterval(() => {
        if (charIndex < text.length) {
          streamContentRef.current += text[charIndex]!;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, thinking: false, content: streamContentRef.current }
                : m,
            ),
          );
          charIndex++;
        } else {
          clearStreamTimers();
        }
      }, 20);
    }, delayMs);
  };

  const buildResultsContext = (tab: TabType, items: any[]) => {
    if (!items?.length) return [];
    return items.slice(0, SEARCH_PAGE_SIZE).map((item: any) => {
      if (tab === "jobs") {
        return {
          id: item.id,
          title: item.title,
          companyName: item.companyName,
          city: item.city,
          category: item.category,
          type: item.type,
          experienceLevel: item.experienceLevel,
        };
      }
      if (tab === "services") {
        return {
          id: item.id,
          title: item.title,
          displayName: item.displayName,
          city: item.city,
          serviceCategory: item.serviceCategory,
          type: item.type,
          price: item.price,
        };
      }
      return {
        id: item.id,
        title: item.title,
        displayName: item.displayName,
        city: item.city,
        category: item.category,
        budget: item.budget,
      };
    });
  };

  const callAgent = async (opts: {
    messageId: number;
    query: string;
    tab: TabType;
    locale: string;
    contextResults: any[];
  }) => {
    const history = messages
      .filter((m) => typeof m.content === "string" && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content as string }));
    const finalHistory =
      history.length > 0 &&
      history[history.length - 1]?.role === "user" &&
      history[history.length - 1]?.content === opts.query
        ? history
        : [...history, { role: "user" as const, content: opts.query }];

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: finalHistory,
        context: {
          locale: opts.locale,
          tab: opts.tab,
          query: opts.query,
          results: opts.contextResults,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Chat API error ${res.status}`);
    }
    const json = (await res.json()) as any;
    const text = json?.text;
    if (typeof text !== "string") throw new Error("Chat API returned invalid payload.");
    streamAssistantText(opts.messageId, text);
  };

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
      pageSize: SEARCH_PAGE_SIZE,
      search: submittedQuery || undefined,
      category: selectedJobCategory,
    },
    {
      enabled: hasSearched && activeTab === "jobs" && !!submittedQuery.trim(),
      refetchOnWindowFocus: false,
    },
  );
  const searchServicesQuery = trpc.service.getService.useQuery(
    {
      page: 1,
      pageSize: SEARCH_PAGE_SIZE,
      search: submittedQuery || undefined,
      serviceCategory: selectedServiceCategory,
    },
    {
      enabled: hasSearched && activeTab === "services" && !!submittedQuery.trim(),
      refetchOnWindowFocus: false,
    },
  );
  const searchTasksQuery = trpc.task.getTask.useQuery(
    {
      page: 1,
      pageSize: SEARCH_PAGE_SIZE,
      search: submittedQuery || undefined,
      category: selectedTaskCategory,
    },
    {
      enabled: hasSearched && activeTab === "tasks" && !!submittedQuery.trim(),
      refetchOnWindowFocus: false,
    },
  );

  const isSearching =
    activeTab === "jobs"
      ? searchJobsQuery.isFetching
      : activeTab === "services"
        ? searchServicesQuery.isFetching
        : searchTasksQuery.isFetching;

  const topSearchItems = useMemo(() => {
    if (!hasSearched || !submittedQuery.trim()) return [];
    if (activeTab === "jobs") return (searchJobsQuery.data?.items ?? []).slice(0, SEARCH_PAGE_SIZE);
    if (activeTab === "services") return (searchServicesQuery.data?.items ?? []).slice(0, SEARCH_PAGE_SIZE);
    return (searchTasksQuery.data?.items ?? []).slice(0, SEARCH_PAGE_SIZE);
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
    setChoicePopoverOpen(false);

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
      { id: confirmId, role: "assistant", content: "", thinking: true },
    ]);

    const confirmMessages: Record<TabType, string> = {
      jobs: t("onboarding.confirmChoiceJob"),
      services: t("onboarding.confirmChoiceService"),
      tasks: t("onboarding.confirmChoiceTask"),
    };
    const confirmMsg = confirmMessages[choice];
    streamAssistantText(confirmId, confirmMsg);
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
        { id: greetingId, role: "assistant", content: "", thinking: true, selectPrompt: true },
      ]);

      setChatInput("");

      const greeting = t("onboarding.greeting");
      streamAssistantText(greetingId, greeting);

      return;
    }

    // Now do the actual search (after onboarding)
    setOnboardingStep("done");
    setChatExpanded(true);

    const userMessageId = nextMessageIdRef.current++;
    const assistantMessageId = nextMessageIdRef.current++;
    const resultsKey = `${activeTab}|${effectiveQuery}`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: effectiveQuery },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        thinking: true,
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

    setHasSearched(true);

    // Generate a real assistant reply once results load (or quickly if none).
    setPendingAiReply({
      messageId: assistantMessageId,
      query: effectiveQuery,
      tab: activeTab,
      resultsKey,
      locale,
    });
  };

  useEffect(() => {
    if (!pendingAiReply) return;
    // Wait until the active tab query finished loading for this query/tab combo.
    const isSameKey = submittedResultsKey === pendingAiReply.resultsKey;
    const ready = isSameKey && !topSearchLoading;
    if (!ready) return;

    // Prevent duplicate calls on re-render while the request is in-flight.
    const pending = pendingAiReply;
    setPendingAiReply(null);

    const contextResults = buildResultsContext(pending.tab, topSearchItems);
    setIsStreaming(true);
    void callAgent({
      messageId: pending.messageId,
      query: pending.query,
      tab: pending.tab,
      locale: pending.locale,
      contextResults,
    })
      .catch((err) => {
        streamAssistantText(
          pending.messageId,
          locale === "fr"
            ? "Désolé, je n’arrive pas à répondre pour le moment. Réessaie dans un instant."
            : locale === "ar"
              ? "عذرًا، لا أستطيع الرد الآن. حاول مرة أخرى بعد قليل."
              : "Sorry, I can’t reply right now. Please try again in a moment.",
        );
        console.error(err);
      })
      .finally(() => {
        setIsStreaming(false);
      });
  }, [pendingAiReply, submittedResultsKey, topSearchLoading, topSearchItems, locale]);

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      clearStreamTimers();
    };
  }, []);

  const tabLabels = {
    jobs: t("tabs.jobs"),
    services: t("tabs.services"),
    tasks: t("tabs.tasks"),
  };

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
      selectedCategory: selectedCategory ? String(selectedCategory) : undefined,
      onTypeChange: (nextType) => {
        setActiveTab(nextType);
        setHasSearched(false);
        setSubmittedQuery("");
        setSelectedCategory(undefined);
        setPreviewPageSize(12);
      },
      onCategoryChange: (nextCategory) => {
        setSelectedCategory(nextCategory as any);
        setPreviewPageSize(12);
        // If user already searched, keep search mode (query hooks will refetch automatically).
        const hasQuery = !!submittedQuery.trim();
        setHasSearched(hasQuery);
      },
      onLoadMore: handleLoadMorePreview,
      loadMoreLabel: t("loadMore"),
    });
  }, [
    activeTab,
    onPreviewChange,
    t,
    previewItems,
    selectedCategory,
    submittedQuery,
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
                              {message.thinking ? (
                                <ThinkingBar text={t("thinking")} />
                              ) : (
                                <Markdown>{message.content ?? ""}</Markdown>
                              )}

                              <div className="mt-3">
                                <Popover open={choicePopoverOpen} onOpenChange={setChoicePopoverOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="inline-flex items-center gap-2 font-semibold text-slate-900 transition hover:bg-slate-100 hover:text-slate-900"
                                    >
                                      <Sparkles className="h-4 w-4" />
                                      {t("onboarding.chooseAction")}
                                      <ChevronDown className="h-4 w-4 opacity-60" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    align={dir === "rtl" ? "end" : "start"}
                                    sideOffset={8}
                                    className="w-56 p-1"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleChoiceSelection("jobs")}
                                      className="flex w-full items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-slate-100"
                                    >
                                      {t("onboarding.choiceJob")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleChoiceSelection("services")}
                                      className="flex w-full items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-slate-100"
                                    >
                                      {t("onboarding.choiceService")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleChoiceSelection("tasks")}
                                      className="flex w-full items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-slate-100"
                                    >
                                      {t("onboarding.choiceTask")}
                                    </button>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          ) : message.results ? (
                            <div className="w-full max-w-[85%] sm:max-w-[75%] rounded-lg bg-slate-50 px-4 py-2.5 text-slate-900">
                              {message.thinking ? (
                                <ThinkingBar text={t("thinking")} />
                              ) : (
                                <Markdown>{message.content ?? ""}</Markdown>
                              )}

                              <div className="mt-2 text-sm text-slate-600">
                                {message.results.isLoading
                                  ? t("searching")
                                  : message.results.items.length === 0
                                    ? "No results found. Try adjusting your search."
                                    : null}
                              </div>

                              {!message.results.isLoading && message.results.items.length > 0 && (
                                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                              {message.thinking ? (
                                <ThinkingBar text={t("thinking")} />
                              ) : (
                                <Markdown>{message.content ?? ""}</Markdown>
                              )}
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
                    ref={chatInputRef}
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

          {/* Prompt shortcuts (replaces old category chips) */}
          {!chatExpanded && (
            <ActionButton
              inputRef={chatInputRef}
              onCategoryClick={() => {
                // no-op (reserved for analytics later)
              }}
              onSelectPrompt={(prompt) => {
                setChatInput(prompt);
                chatInputRef.current?.focus();
                void handleSearch(prompt);
              }}
            />
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
