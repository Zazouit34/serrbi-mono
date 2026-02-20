"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Search } from "lucide-react";
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
import { ThinkingBar } from "@/components/ui/thinking-bar";
import { ActionButton } from "@/components/ui/action-button";

type TabType = "jobs" | "services" | "tasks";
type ScopeOverride = "auto" | TabType;

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
  kind?: "text" | "results" | "suggestions";
  results?: {
    key: string;
    query: string;
    type: TabType;
    items: any[];
    isLoading: boolean;
  };
  relatedPrompts?: string[];
  suggestionsForKey?: string;
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

type AgentIntent = TabType;

type AgentResponse = {
  action: "chat" | "search";
  intent: AgentIntent;
  searchQuery: string;
  assistantText?: string;
  relatedPrompts: string[];
};

function getScopeLabel(locale: string, scope: ScopeOverride, t: ReturnType<typeof useTranslations>) {
  const auto =
    locale === "ar" ? "تلقائي" : locale === "fr" ? "Auto" : "Auto";
  const tabLabels = {
    jobs: t("tabs.jobs"),
    services: t("tabs.services"),
    tasks: t("tabs.tasks"),
  };
  if (scope === "auto") return auto;
  return tabLabels[scope];
}

function getRelatedLabel(locale: string) {
  if (locale === "ar") return "ذات صلة";
  if (locale === "fr") return "Suggestions";
  return "Related";
}

function getNoResultsLabel(locale: string) {
  if (locale === "ar") return "لم يتم العثور على نتائج. جرّب تعديل طلبك.";
  if (locale === "fr") return "Aucun résultat. Essayez d’affiner votre recherche.";
  return "No results found. Try adjusting your search.";
}

function SuggestionList({
  prompts,
  onSelect,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
}) {
  if (!Array.isArray(prompts) || prompts.length === 0) return null;

  return (
    <div className="relative w-full">
      <div className="mt-2 space-y-1">
        {prompts.slice(0, 6).map((prompt, index) => (
          <button
            key={`${index}-${prompt}`}
            type="button"
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 group"
            onClick={() => onSelect(prompt)}
          >
            <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 group-hover:text-slate-700" />
            <span className="text-slate-800">{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [scopeOverride, setScopeOverride] = useState<ScopeOverride>("auto");
  const [selectedCategory, setSelectedCategory] = useState<
    JobCategory | ServiceCategory | TaskCategory | undefined
  >(undefined);
  const isSecondary = isSecondaryClient();
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [pendingRelatedByKey, setPendingRelatedByKey] = useState<Record<string, string[]>>({});
  const nextMessageIdRef = useRef(1);
  const placeholderIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  const callSearchAgent = async (opts: {
    query: string;
    locale: string;
    scope: ScopeOverride;
  }): Promise<AgentResponse> => {
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
          scope: opts.scope,
          query: opts.query,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Chat API error ${res.status}`);
    }
    const json = (await res.json()) as AgentResponse;
    if (!json || (json.action !== "chat" && json.action !== "search") || !Array.isArray(json.relatedPrompts)) {
      throw new Error("Chat API returned invalid payload.");
    }
    return json;
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

  // After a search finishes, append suggestions as their own assistant bubble.
  useEffect(() => {
    if (!submittedResultsKey) return;
    if (!hasSearched) return;
    if (topSearchLoading) return;

    const prompts = pendingRelatedByKey[submittedResultsKey];
    if (!Array.isArray(prompts) || prompts.length === 0) return;

    setMessages((prev) => {
      if (prev.some((m) => m.kind === "suggestions" && m.suggestionsForKey === submittedResultsKey)) {
        return prev;
      }
      const id = nextMessageIdRef.current++;
      return [
        ...prev,
        {
          id,
          role: "assistant",
          kind: "suggestions",
          content: getRelatedLabel(locale),
          relatedPrompts: prompts,
          suggestionsForKey: submittedResultsKey,
        },
      ];
    });

    setPendingRelatedByKey((prev) => {
      const next = { ...prev };
      delete next[submittedResultsKey];
      return next;
    });
  }, [submittedResultsKey, hasSearched, topSearchLoading, pendingRelatedByKey, locale]);

  const handleSearch = async (overrideQuery?: string) => {
    const effectiveQuery = (overrideQuery ?? chatInput).trim();

    if (!isLoggedIn) {
      const callback = pathname || "/";
      router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }

    // For the secondary client, keep simple redirect behavior (but let the agent pick scope)
    if (isSecondary) {
      setIsAgentWorking(true);
      try {
        const agent = await callSearchAgent({ query: effectiveQuery, locale, scope: scopeOverride });
        const tab: TabType = scopeOverride === "auto" ? agent.intent : scopeOverride;
        const q = (agent.searchQuery || effectiveQuery).trim();
        const searchParams = new URLSearchParams();
        if (q) searchParams.set("search", q);
        const routes: Record<TabType, string> = {
          jobs: `/jobs?${searchParams.toString()}`,
          services: `/services?${searchParams.toString()}`,
          tasks: `/tasks?${searchParams.toString()}`,
        };
        window.location.href = routes[tab] ?? routes.jobs;
        return;
      } finally {
        setIsAgentWorking(false);
      }
    }

    if (!effectiveQuery) {
      setHasSearched(false);
      setSubmittedQuery("");
      return;
    }

    setChatExpanded(true);

    const userMessageId = nextMessageIdRef.current++;
    const assistantMessageId = nextMessageIdRef.current++;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: effectiveQuery },
      { id: assistantMessageId, role: "assistant", kind: "text", content: "", thinking: true },
    ]);

    setChatInput("");

    setIsAgentWorking(true);
    try {
      const agent = await callSearchAgent({ query: effectiveQuery, locale, scope: scopeOverride });
      if (agent.action === "chat") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  thinking: false,
                  kind: "text",
                  content: agent.assistantText ?? "",
                }
              : m,
          ),
        );

        if (Array.isArray(agent.relatedPrompts) && agent.relatedPrompts.length > 0) {
          const suggestionsId = nextMessageIdRef.current++;
          setMessages((prev) => [
            ...prev,
            {
              id: suggestionsId,
              role: "assistant",
              kind: "suggestions",
              content: getRelatedLabel(locale),
              relatedPrompts: agent.relatedPrompts,
            },
          ]);
        }
        return;
      }

      const tab: TabType = scopeOverride === "auto" ? agent.intent : scopeOverride;
      const q = (agent.searchQuery || "").trim();
      if (!q) {
        // If the agent couldn't produce a search query, treat it like chat.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  thinking: false,
                  kind: "text",
                  content: agent.assistantText ?? "",
                }
              : m,
          ),
        );
        return;
      }

      const resultsKey = `${tab}|${q}`;

      setActiveTab(tab);
      setSubmittedQuery(q);
      setSelectedCategory(undefined);
      setPreviewPageSize(12);
      setHasSearched(true);

      if (Array.isArray(agent.relatedPrompts) && agent.relatedPrompts.length > 0) {
        setPendingRelatedByKey((prev) => ({ ...prev, [resultsKey]: agent.relatedPrompts.slice(0, 6) }));
      }

      // Turn the assistant bubble into the results bubble (cards only).
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                thinking: false,
                kind: "results",
                content: "",
                results: {
                  key: resultsKey,
                  query: q,
                  type: tab,
                  items: [],
                  isLoading: true,
                },
              }
            : m,
        ),
      );
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                thinking: false,
                kind: "text",
                content:
                  locale === "fr"
                    ? "Désolé, je n’arrive pas à lancer la recherche pour le moment. Réessaie dans un instant."
                    : locale === "ar"
                      ? "عذرًا، لا أستطيع بدء البحث الآن. حاول مرة أخرى بعد قليل."
                      : "Sorry, I can’t start the search right now. Please try again in a moment.",
              }
            : m,
        ),
      );
    } finally {
      setIsAgentWorking(false);
    }
  };

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
                          message.kind === "suggestions" ? (
                            <div className="inline-block w-fit max-w-[85%] sm:max-w-[75%] rounded-lg bg-slate-50 px-4 py-2.5 text-slate-900">
                              <SuggestionList
                                prompts={message.relatedPrompts ?? []}
                                onSelect={(p) => {
                                  setChatInput(p);
                                  chatInputRef.current?.focus();
                                  void handleSearch(p);
                                }}
                              />
                            </div>
                          ) : message.results ? (
                            <div className="w-full max-w-full rounded-lg bg-slate-50 px-4 py-2.5 text-slate-900">
                              {message.results.isLoading ? (
                                <ThinkingBar text={t("searching")} />
                              ) : null}

                              {!message.results.isLoading && message.results.items.length === 0 ? (
                                <div className="text-sm text-slate-700">
                                  {getNoResultsLabel(locale)}
                                </div>
                              ) : null}

                              {!message.results.isLoading && message.results.items.length > 0 && (
                                <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-3">
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
                      value={scopeOverride}
                      onValueChange={(value) => setScopeOverride(value as ScopeOverride)}
                    >
                      <SelectTrigger className="h-8 min-w-[120px] px-3 text-sm">
                        <SelectValue placeholder={getScopeLabel(locale, scopeOverride, t)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{getScopeLabel(locale, "auto", t)}</SelectItem>
                        <SelectItem value="jobs">{tabLabels.jobs}</SelectItem>
                        <SelectItem value="services">{tabLabels.services}</SelectItem>
                        <SelectItem value="tasks">{tabLabels.tasks}</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => void handleSearch()}
                      disabled={isSearching || isAgentWorking}
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

          {/* Prompt shortcuts (like before) */}
          {!chatExpanded && (
            <ActionButton
              inputRef={chatInputRef}
              onCategoryClick={() => {
                // reserved for analytics
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
