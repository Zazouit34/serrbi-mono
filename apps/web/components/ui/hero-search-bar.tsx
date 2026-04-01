"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { useLocale, useTranslations } from "next-intl";

import { PreviewCards } from "@/components/ui/preview-cards";
import { trpc } from "@/app/_trpc/client";
import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { taskCategoryValues } from "@workspace/ui/lib/task-enum";
import { ActionButton } from "@/components/ui/action-button";
import { AgentChatContainer } from "@/components/ui/agent-chat-container";
import { useResumeAttach, type ResumeProfile, type ResumeInsightData } from "@/components/ui/use-resume-attach";

type TabType = "jobs" | "services" | "tasks";
type ScopeOverride = "auto" | TabType;

const MAX_PAGE_SIZE = 50;
const SEARCH_PAGE_SIZE = 3;

type JobCategory = (typeof jobCategoryValues)[number];
type ServiceCategory = (typeof serviceCategoryValues)[number];
type TaskCategory = (typeof taskCategoryValues)[number];

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content?: string;
  thinking?: boolean;
  kind?: "text" | "results" | "suggestions" | "resume-insight";
  results?: {
    key: string;
    query: string;
    type: TabType;
    items: any[];
    isLoading: boolean;
  };
  relatedPrompts?: string[];
  suggestionsForKey?: string;
  upgradeUrl?: string;
  suggestedIntentSwitch?: TabType; // set on scope-mismatch suggestions so we can auto-switch
  resumeUploadCta?: {
    title: string;
    description: string;
    buttonLabel: string;
  };
  resumeInsight?: {
    score: number;
    skillGaps: string[];
    improvements: string[];
    suggestedRoles?: string[];
  };
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
  sessionId?: string;
  initialMessages?: ChatMessage[];
  inSession?: boolean;
};

type AgentIntent = TabType;

type AgentResponse = {
  action: "chat" | "search";
  intent: AgentIntent;
  searchQuery: string;
  assistantText?: string;
  relatedPrompts: string[];
  results?: {
    type: TabType;
    items: any[];
  };
  resumeUploadCta?: {
    title: string;
    description: string;
    buttonLabel: string;
  };
  resumeInsight?: {
    score: number;
    skillGaps: string[];
    improvements: string[];
    suggestedRoles?: string[];
  };
  intentMismatch?: { suggestedIntent: TabType };
  debug?: Record<string, unknown>;
  planLimitReached?: boolean;
  upgradeUrl?: string;
};

type ResultsSummaryResponse = {
  summary: string;
};
type ConfidenceMode = "strong" | "moderate" | "weak";

// Minimal fallback summary (only used if API call fails)
function buildResultsSummary(params: {
  type: TabType;
  items: any[];
  query: string;
}): string {
  const { type, items, query } = params;
  if (!items.length) return "";
  const first = items[0];
  if (type === "jobs") {
    return [
      `## Results for "${query}"`,
      `- **Top match:** ${first?.title ?? "Top result"}${first?.city ? ` (${first.city})` : ""}.`,
    ].join("\n");
  }
  if (type === "services") {
    return `## Results for "${query}"\n- **Top match:** ${first?.title ?? "Top result"}.`;
  }
  return `## Tasks for "${query}"\n- **Top option:** ${first?.title ?? "Top result"}.`;
}

function HeroSearchBarComponent({
  onPreviewChange,
  onChatExpandedChange,
  sessionId: propSessionId,
  initialMessages,
  inSession = false,
}: HeroSearchBarProps) {
  const t = useTranslations("HeroSearchBar");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user?.email;
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabType>("jobs");
  const [chatInput, setChatInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [previewPageSize, setPreviewPageSize] = useState(12);
  const [pinnedIntent, setPinnedIntent] = useState<TabType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    JobCategory | ServiceCategory | TaskCategory | undefined
  >(undefined);

  // Chat state
  const hasInitial = Array.isArray(initialMessages) && initialMessages.length > 0;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!hasInitial) return [];
    return initialMessages!.map((m) => ({
      ...m,
      thinking: false,
      results: m.results ? { ...m.results, isLoading: false } : undefined,
    }));
  });
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(hasInitial);
  const [placeholder, setPlaceholder] = useState("");
  const [resumeAttachStatusText, setResumeAttachStatusText] = useState<string>("");
  const [resumeAttachProgress, setResumeAttachProgress] = useState<number | null>(null);
  const [resumeAttachFileName, setResumeAttachFileName] = useState<string>("");
  const [hasResumeAttached, setHasResumeAttached] = useState(false);
  const nextMessageIdRef = useRef(
    hasInitial ? Math.max(...initialMessages!.map((m) => m.id), 0) + 1 : 1,
  );
  const placeholderIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const agentSessionIdRef = useRef<string | null>(null);
  const dbSessionIdRef = useRef<string | null>(propSessionId ?? null);

  const userDataQuery = trpc.auth.userData.useQuery(undefined, {
    enabled: isLoggedIn,
    refetchOnWindowFocus: false,
  });

  const createSession = trpc.chatSession.create.useMutation();
  const updateSession = trpc.chatSession.update.useMutation();

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const serializeMessages = (msgs: ChatMessage[]) =>
    msgs
      .filter((m) => !m.thinking && !m.results?.isLoading)
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content ?? "",
        kind: m.kind,
        results: m.results ? { ...m.results, isLoading: false } : undefined,
        relatedPrompts: m.relatedPrompts,
        resumeUploadCta: m.resumeUploadCta,
      }));

  // Create/update DB session on messages change
  const isCreatingSessionRef = useRef(false);
  const isFirstEffectRunRef = useRef(true);
  useEffect(() => {
    if (messages.length === 0) return;
    const hasUser = messages.some((m) => m.role === "user" && m.content?.trim());
    if (!hasUser) return;
    const anyLoading = messages.some((m) => m.thinking || m.results?.isLoading);
    if (anyLoading) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    if (isFirstEffectRunRef.current && dbSessionIdRef.current) {
      isFirstEffectRunRef.current = false;
      return;
    }
    isFirstEffectRunRef.current = false;

    if (!dbSessionIdRef.current && isLoggedIn && !isCreatingSessionRef.current) {
      isCreatingSessionRef.current = true;
      const userMsgs = messages.filter((m) => m.role === "user" && m.content?.trim());
      const title = userMsgs[0]?.content?.trim().slice(0, 60) || "Chat";
      createSession.mutateAsync({ title, messages: serializeMessages(messages) }).then((res) => {
        dbSessionIdRef.current = res.id;
        router.replace(`/c/${res.id}`);
      }).catch(() => {
        isCreatingSessionRef.current = false;
      });
      return;
    }

    saveTimerRef.current = setTimeout(() => {
      const sid = dbSessionIdRef.current;
      if (!sid) return;
      const userMsgs = messages.filter((m) => m.role === "user" && m.content?.trim());
      const title = userMsgs[0]?.content?.trim().slice(0, 60) || "Chat";
      updateSession.mutate({ id: sid, title, messages: serializeMessages(messages) });
    }, 1500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages]);

  // Sync resume status from DB and fetch insight for new sessions
  const hasShownInitialInsightRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn) {
      setHasResumeAttached(false);
      return;
    }
    const hasSavedResume = Boolean((userDataQuery.data as any)?.user?.resumeUrl);
    if (hasSavedResume) {
      setHasResumeAttached(true);
      
      // Show resume insight in new sessions (not when restoring from initialMessages)
      if (!hasInitial && !hasShownInitialInsightRef.current && messages.length === 0) {
        hasShownInitialInsightRef.current = true;
        
        // Fetch and show resume insight
        void (async () => {
          try {
            const resumeText = (userDataQuery.data as any)?.user?.resumeText || "";
            if (!resumeText) return;
            
            const res = await fetch("/api/chat/resume-insight", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: resumeText, locale }),
            });
            
            if (res.ok) {
              const data = await res.json();
              setMessages((prev) => [
                ...prev,
                {
                  id: nextMessageIdRef.current++,
                  role: "assistant" as const,
                  kind: "resume-insight" as const,
                  resumeInsight: {
                    score: data.score,
                    skillGaps: data.skillGaps || [],
                    improvements: data.improvements || [],
                    suggestedRoles: data.suggestedRoles || [],
                  },
                } as ChatMessage,
              ]);
              setChatExpanded(true);
            }
          } catch (error) {
            console.error("Failed to fetch resume insight:", error);
          }
        })();
      }
      return;
    }
    if (!resumeAttachStatusText && resumeAttachProgress == null) {
      setHasResumeAttached(false);
    }
  }, [isLoggedIn, userDataQuery.data, resumeAttachStatusText, resumeAttachProgress, hasInitial, messages.length, locale]);

  // Resume attach hook
  const { handleResumeAttach } = useResumeAttach({
    isLoggedIn,
    locale,
    onStatusChange: (text) => {
      setResumeAttachStatusText(text);
      setChatExpanded(true);
    },
    onProgressChange: setResumeAttachProgress,
    onFileNameChange: setResumeAttachFileName,
    onAttached: (profile: ResumeProfile, insight: ResumeInsightData | null) => {
      setResumeAttachStatusText("");
      setHasResumeAttached(true);
      userDataQuery.refetch();

      // Pin jobs intent automatically
      if (!pinnedIntent) {
        setPinnedIntent("jobs");
        setActiveTab("jobs");
      }

      const jobTitle = profile.jobTitle;
      const skills = profile.skills ?? [];
      const searchQuery = jobTitle
        ? jobTitle
        : skills.length > 0
          ? skills.slice(0, 3).join(", ")
          : null;

      // Inject insight card if we got one
      if (insight) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageIdRef.current++,
            role: "assistant" as const,
            kind: "resume-insight" as const,
            resumeInsight: insight,
          } as ChatMessage,
        ]);
      }

      // Inject suggestion to search based on the resume profile
      if (searchQuery) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageIdRef.current++,
            role: "assistant" as const,
            kind: "suggestions" as const,
            content: t("resume.postUploadMessage").replace("{jobTitle}", jobTitle ?? skills[0] ?? "your profile"),
            relatedPrompts: [searchQuery],
          } as ChatMessage,
        ]);
      }
    },
    onError: () => {
      const hasSavedResume = Boolean((userDataQuery.data as any)?.user?.resumeUrl);
      setHasResumeAttached(hasSavedResume);
    },
  });

  const getOrCreateAgentSessionId = (): string => {
    if (agentSessionIdRef.current) return agentSessionIdRef.current;
    const storageKey = "serrbi:agent-session-id";
    try {
      const existing = localStorage.getItem(storageKey)?.trim();
      if (existing) {
        agentSessionIdRef.current = existing;
        return existing;
      }
      const next =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(storageKey, next);
      agentSessionIdRef.current = next;
      return next;
    } catch {
      const fallback = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      agentSessionIdRef.current = fallback;
      return fallback;
    }
  };

  const callSearchAgent = async (opts: {
    query: string;
    locale: string;
    scope: ScopeOverride;
    categoryHint?: string;
  }): Promise<AgentResponse> => {
    const sessionId = getOrCreateAgentSessionId();
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
          categoryHint: opts.categoryHint,
          sessionId,
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

  const currentScope: ScopeOverride = pinnedIntent ?? "auto";
  const buildCategoryHint = (intent: TabType | null, category?: string): string | undefined => {
    if (!intent || !category) return undefined;
    const raw = category.trim();
    if (!raw) return undefined;
    const humanized = raw
      .replace(/[_-]+/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .trim();
    return `${intent} category: ${raw}${humanized && humanized !== raw ? ` (${humanized})` : ""}`;
  };

  const callResultsSummary = async (opts: {
    locale: string;
    intent: AgentIntent;
    query: string;
    items: any[];
  }): Promise<string> => {
    const toScore = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const compactItems = opts.items.slice(0, SEARCH_PAGE_SIZE).map((item: any) => {
      const matchScore =
        toScore(item?.matchScore) ??
        toScore(item?.matchPercent) ??
        (typeof item?.finalScore === "number" ? Math.round(item.finalScore * 100) : null) ??
        (typeof item?._score === "number" ? Math.round(item._score * 100) : null);
      if (opts.intent === "jobs") {
        return {
          title: item?.title ?? null,
          companyName: item?.companyName ?? null,
          city: item?.city ?? null,
          experienceLevel: item?.experienceLevel ?? null,
          locationRequirement: item?.locationRequirement ?? null,
          wage: item?.wage ?? null,
          type: item?.type ?? null,
          matchScore,
        };
      }
      if (opts.intent === "services") {
        return {
          title: item?.title ?? null,
          serviceCategory: item?.serviceCategory ?? null,
          city: item?.city ?? null,
          price: item?.price ?? null,
          type: item?.type ?? null,
          averageRating: item?.averageRating ?? null,
          numberOfReviews: item?.numberOfReviews ?? null,
          matchScore,
        };
      }
      return {
        title: item?.title ?? null,
        category: item?.category ?? null,
        city: item?.city ?? null,
        budget: item?.budget ?? null,
        status: item?.status ?? null,
        matchScore,
      };
    });

    const topScore = toScore(compactItems[0]?.matchScore) ?? 0;
    const secondScore = toScore(compactItems[1]?.matchScore) ?? 0;
    const scoreGap = topScore - secondScore;
    const confidenceMode: ConfidenceMode =
      topScore >= 75 && scoreGap >= 10 ? "strong" : topScore >= 55 ? "moderate" : "weak";

    const res = await fetch("/api/chat/results-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: opts.locale,
        intent: opts.intent,
        query: opts.query,
        confidenceMode,
        items: compactItems,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Results summary API error ${res.status}`);
    }
    const json = (await res.json()) as ResultsSummaryResponse;
    return typeof json?.summary === "string" ? json.summary.trim() : "";
  };

  const handlePromptSelection = (prompt: string, upgradeUrl?: string, intentSwitch?: TabType) => {
    const normalized = prompt.trim().toLowerCase();
    if (normalized === "plans" || normalized === "plan" || normalized === "pricing") {
      router.push(upgradeUrl || "/subscription");
      return;
    }
    // User confirmed an intent switch from a scope-mismatch suggestion
    if (intentSwitch) {
      setPinnedIntent(intentSwitch);
      setActiveTab(intentSwitch);
      // Add a user confirmation message and proceed with the search under the new intent
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageIdRef.current++,
          role: "user" as const,
          content: prompt,
        } as ChatMessage,
      ]);
      void handleSearch(prompt, intentSwitch);
      return;
    }
    setChatInput(prompt);
    chatInputRef.current?.focus();
    void handleSearch(prompt);
  };

  const handleQuickActionToggle = (action: TabType) => {
    setPinnedIntent((prev) => {
      const next = prev === action ? null : action;
      if (!next) {
        setSelectedCategory(undefined);
      } else {
        if (prev && prev !== next) setSelectedCategory(undefined);
        setActiveTab(next);
      }
      return next;
    });
  };

  const handleQuickCategoryToggle = (category: string) => {
    const normalizedCategory = category?.trim();
    if (!normalizedCategory) {
      setSelectedCategory(undefined);
      return;
    }
    setSelectedCategory((prev) => {
      if (prev && String(prev) === normalizedCategory) return undefined;
      return normalizedCategory as JobCategory | ServiceCategory | TaskCategory;
    });
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
        if (placeholderIntervalRef.current) clearInterval(placeholderIntervalRef.current);
      }
    };

    placeholderIntervalRef.current = setInterval(streamPlaceholder, 50);
    return () => {
      if (placeholderIntervalRef.current) clearInterval(placeholderIntervalRef.current);
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
    { page: 1, pageSize: Math.min(previewPageSize, MAX_PAGE_SIZE), search: undefined, category: selectedJobCategory },
    { refetchOnWindowFocus: false },
  );
  const previewServicesQuery = trpc.service.getService.useQuery(
    { page: 1, pageSize: Math.min(previewPageSize, MAX_PAGE_SIZE), search: undefined, serviceCategory: selectedServiceCategory },
    { refetchOnWindowFocus: false },
  );
  const previewTasksQuery = trpc.task.getTask.useQuery(
    { page: 1, pageSize: Math.min(previewPageSize, MAX_PAGE_SIZE), search: undefined, category: selectedTaskCategory },
    { refetchOnWindowFocus: false },
  );

  const handleLoadMorePreview = () => {
    setPreviewPageSize((prev) => Math.min(prev + 12, MAX_PAGE_SIZE));
  };

  // Search result queries
  const searchJobsQuery = trpc.job.getJob.useQuery(
    { page: 1, pageSize: SEARCH_PAGE_SIZE, search: submittedQuery || undefined, category: undefined },
    { enabled: hasSearched && activeTab === "jobs" && !!submittedQuery.trim(), refetchOnWindowFocus: false },
  );
  const searchServicesQuery = trpc.service.getService.useQuery(
    { page: 1, pageSize: SEARCH_PAGE_SIZE, search: submittedQuery || undefined, serviceCategory: undefined },
    { enabled: hasSearched && activeTab === "services" && !!submittedQuery.trim(), refetchOnWindowFocus: false },
  );
  const searchTasksQuery = trpc.task.getTask.useQuery(
    { page: 1, pageSize: SEARCH_PAGE_SIZE, search: submittedQuery || undefined, category: undefined },
    { enabled: hasSearched && activeTab === "tasks" && !!submittedQuery.trim(), refetchOnWindowFocus: false },
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
  }, [hasSearched, submittedQuery, activeTab, searchJobsQuery.data?.items, searchServicesQuery.data?.items, searchTasksQuery.data?.items]);

  const topSearchLoading = useMemo(() => {
    if (!hasSearched || !submittedQuery.trim()) return false;
    if (activeTab === "jobs") return searchJobsQuery.isFetching;
    if (activeTab === "services") return searchServicesQuery.isFetching;
    return searchTasksQuery.isFetching;
  }, [hasSearched, submittedQuery, activeTab, searchJobsQuery.isFetching, searchServicesQuery.isFetching, searchTasksQuery.isFetching]);

  const submittedResultsKey = useMemo(() => {
    if (!submittedQuery.trim()) return "";
    return `${activeTab}|${submittedQuery.trim()}`;
  }, [activeTab, submittedQuery]);

  // Results summary effect: fires after search query completes
  useEffect(() => {
    if (!hasSearched || !submittedQuery.trim() || topSearchLoading) return;
    let cancelled = false;

    void (async () => {
      try {
        const rawSummary = await callResultsSummary({
          locale,
          intent: activeTab,
          query: submittedQuery,
          items: topSearchItems,
        });
        if (cancelled || !rawSummary) return;

        const summary = hasResumeAttached && activeTab === "jobs"
          ? `📈 Based on your resume\n\n${rawSummary}`
          : rawSummary;

        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.results) return msg;
            if (msg.results.key !== submittedResultsKey) return msg;
            return { ...msg, content: summary };
          }),
        );
      } catch {
        const fallback = buildResultsSummary({ type: activeTab, items: topSearchItems, query: submittedQuery });
        if (cancelled || !fallback) return;
        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.results) return msg;
            if (msg.results.key !== submittedResultsKey) return msg;
            return { ...msg, content: fallback };
          }),
        );
      }
    })();

    return () => { cancelled = true; };
  }, [hasSearched, submittedQuery, submittedResultsKey, topSearchLoading, topSearchItems, locale, activeTab, hasResumeAttached]);

  const handleSearch = async (overrideQuery?: string, overrideIntent?: TabType) => {
    const effectiveQuery = (overrideQuery ?? chatInput).trim();

    if (!isLoggedIn) {
      const callback = pathname || "/";
      router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }

    // Effective scope uses overrideIntent if provided (e.g. after user confirms intent switch)
    const effectiveScope: ScopeOverride = overrideIntent ?? currentScope;

    if (!effectiveQuery) return;
    setChatExpanded(true);
    setIsAgentWorking(true);
    setChatInput("");

    // When called from handlePromptSelection with intentSwitch, user message was already injected
    let assistantMessageId: number;
    if (!overrideIntent) {
      const userMessageId = nextMessageIdRef.current++;
      assistantMessageId = nextMessageIdRef.current++;
      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: "user" as const, content: effectiveQuery },
        { id: assistantMessageId, role: "assistant" as const, thinking: true, content: "" },
      ]);
    } else {
      assistantMessageId = nextMessageIdRef.current++;
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant" as const, thinking: true, content: "" },
      ]);
    }

    try {
      const categoryHint =
        (overrideIntent ?? pinnedIntent) && activeTab === (overrideIntent ?? pinnedIntent)
          ? buildCategoryHint((overrideIntent ?? pinnedIntent)!, String(selectedCategory ?? ""))
          : undefined;
      const agent = await callSearchAgent({ query: effectiveQuery, locale, scope: effectiveScope, categoryHint });

      if (agent.planLimitReached) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  thinking: false,
                  kind: "suggestions" as const,
                  content: agent.assistantText ?? "",
                  relatedPrompts: agent.relatedPrompts,
                  upgradeUrl: agent.upgradeUrl,
                }
              : m,
          ),
        );
        return;
      }

      if (agent.action === "chat") {
        // Scope mismatch: agent proposes to switch intent
        if (agent.intentMismatch) {
          const { suggestedIntent } = agent.intentMismatch;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    thinking: false,
                    kind: "suggestions" as const,
                    content: agent.assistantText ?? "",
                    relatedPrompts: agent.relatedPrompts,
                    suggestedIntentSwitch: suggestedIntent,
                  }
                : m,
            ),
          );
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  thinking: false,
                  kind: "text" as const,
                  content: agent.assistantText ?? "",
                }
              : m,
          ),
        );
        return;
      }

      // Agent returned a search intent — auto-pin if not already pinned
      const tab: TabType = overrideIntent ?? pinnedIntent ?? agent.intent;
      if (!pinnedIntent && !overrideIntent) {
        setPinnedIntent(tab);
        setActiveTab(tab);
      }

      const q = (agent.searchQuery || "").trim();
      if (!q) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, thinking: false, kind: "text" as const, content: agent.assistantText ?? "" }
              : m,
          ),
        );
        return;
      }

      const resultsKey = `${tab}|${q}`;
      const directResults =
        agent.results &&
        Array.isArray(agent.results.items) &&
        agent.results.items.length >= 0
          ? agent.results
          : null;

      if (directResults && (tab === "jobs" || tab === "services")) {
        setActiveTab(tab);
        setHasSearched(false);
        setSubmittedQuery("");
        if (!pinnedIntent) setSelectedCategory(undefined);
        setPreviewPageSize(12);

        // Ensure content is never empty for directResults
        const finalAssistantText =
          agent.assistantText?.trim() ||
          buildResultsSummary({ type: tab, items: directResults.items, query: q });

        // Inject resume insight if provided by agent
        if (agent.resumeInsight) {
          setMessages((prev) => [
            ...prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    thinking: false,
                    kind: "results" as const,
                    content: finalAssistantText,
                    resumeUploadCta: agent.resumeUploadCta,
                    relatedPrompts: agent.relatedPrompts,
                    results: {
                      key: resultsKey,
                      query: q,
                      type: tab,
                      items: directResults.items.slice(0, SEARCH_PAGE_SIZE),
                      isLoading: false,
                    },
                  }
                : m,
            ),
            {
              id: nextMessageIdRef.current++,
              role: "assistant" as const,
              kind: "resume-insight" as const,
              resumeInsight: agent.resumeInsight,
            } as ChatMessage,
          ]);
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    thinking: false,
                    kind: "results" as const,
                    content: finalAssistantText,
                    resumeUploadCta: agent.resumeUploadCta,
                    relatedPrompts: agent.relatedPrompts,
                    results: {
                      key: resultsKey,
                      query: q,
                      type: tab,
                      items: directResults.items.slice(0, SEARCH_PAGE_SIZE),
                      isLoading: false,
                    },
                  }
                : m,
            ),
          );
        }
        return;
      }

      setActiveTab(tab);
      setSubmittedQuery(q);
      if (!pinnedIntent) setSelectedCategory(undefined);
      setPreviewPageSize(12);
      setHasSearched(true);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                thinking: false,
                kind: "results" as const,
                content: "",
                resumeUploadCta: agent.resumeUploadCta,
                relatedPrompts: agent.relatedPrompts,
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
                kind: "text" as const,
                content: t("errorMessage"),
              }
            : m,
        ),
      );
    } finally {
      setIsAgentWorking(false);
    }
  };

  const previewItems = useMemo(() => {
    if (activeTab === "jobs") {
      return { items: previewJobsQuery.data?.items ?? [], loading: previewJobsQuery.isLoading };
    }
    if (activeTab === "services") {
      return { items: previewServicesQuery.data?.items ?? [], loading: previewServicesQuery.isLoading };
    }
    return { items: previewTasksQuery.data?.items ?? [], loading: previewTasksQuery.isLoading };
  }, [activeTab, previewJobsQuery.data?.items, previewJobsQuery.isLoading, previewServicesQuery.data?.items, previewServicesQuery.isLoading, previewTasksQuery.data?.items, previewTasksQuery.isLoading]);

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
        const hasQuery = !!submittedQuery.trim();
        setHasSearched(hasQuery);
      },
      onLoadMore: handleLoadMorePreview,
      loadMoreLabel: t("loadMore"),
    });
  }, [activeTab, onPreviewChange, t, previewItems, selectedCategory, submittedQuery]);

  return (
    <div className={`mx-auto w-full max-w-none text-left md:max-w-4xl ${chatExpanded ? "h-full min-h-0" : ""}`}>
      <div className={`md:px-6 ${chatExpanded ? "h-full min-h-0" : ""}`}>
        <div className={`mx-auto flex w-full flex-col gap-3 md:gap-4 ${chatExpanded ? "h-full min-h-0" : ""}`}>
          <AgentChatContainer
            chatExpanded={chatExpanded}
            messages={messages}
            chatInput={chatInput}
            placeholder={placeholder || t("placeholder")}
            dir={dir}
            isSearching={isSearching}
            isAgentWorking={isAgentWorking}
            pinnedIntent={pinnedIntent}
            inSession={inSession}
            userInitial={session?.user?.name?.slice(0, 1)?.toUpperCase() || "U"}
            chatInputRef={chatInputRef}
            labels={{
              searching: t("searching"),
              thinking: t("thinking"),
              noResults: t("messages.noResults"),
              related: t("labels.related"),
              jobs: t("actionButtons.categories.jobs"),
              services: t("actionButtons.categories.services"),
              tasks: t("actionButtons.categories.tasks"),
              jobsShort: t("jobsShort"),
              servicesShort: t("servicesShort"),
              tasksShort: t("tasksShort"),
              cvShort: "CV",
              whyPicked: t("whyPicked"),
              confidence: t("confidence"),
            }}
            onInputChange={setChatInput}
            onSubmit={() => { void handleSearch(); }}
            onPinnedIntentClear={() => {
              setPinnedIntent(null);
              setSelectedCategory(undefined);
            }}
            onIntentChange={(intent) => {
              setPinnedIntent(intent);
              if (intent) setActiveTab(intent);
              else setSelectedCategory(undefined);
            }}
            onSuggestionSelect={handlePromptSelection}
            onResumeAttach={handleResumeAttach}
            resumeAttachLabel={t("resume.attachLabel")}
            resumeAttachStatusText={resumeAttachStatusText}
            resumeAttachProgress={resumeAttachProgress}
            resumeAttachFileName={resumeAttachFileName}
            hasResumeAttached={hasResumeAttached}
            resumeAttachedLabel={t("resume.attachedLabel")}
          />

          {/* Action buttons shown only when chat is not expanded (home page mode) */}
          {!chatExpanded && (
            <ActionButton
              selectedAction={pinnedIntent}
              selectedCategory={selectedCategory ? String(selectedCategory) : undefined}
              onActionToggle={handleQuickActionToggle}
              onCategoryToggle={handleQuickCategoryToggle}
              onSelectPrompt={(prompt) => {
                setChatInput(prompt);
                chatInputRef.current?.focus();
              }}
            />
          )}
        </div>
      </div>
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
