"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@workspace/ui/components/button";
import { useLocale, useTranslations } from "next-intl";
import { isSecondaryClient } from "@/lib/domain";

import { PreviewCards } from "@/components/ui/preview-cards";
import { trpc } from "@/app/_trpc/client";
import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { taskCategoryValues } from "@workspace/ui/lib/task-enum";
import { ActionButton } from "@/components/ui/action-button";
import { AgentChatContainer } from "@/components/ui/agent-chat-container";

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
  upgradeUrl?: string;
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
  results?: {
    type: TabType;
    items: any[];
  };
  debug?: Record<string, unknown>;
  planLimitReached?: boolean;
  upgradeUrl?: string;
};

type ResultsSummaryResponse = {
  summary: string;
};

function normalizeLocaleForSummary(locale: string): "en" | "fr" | "ar" {
  const lower = locale.toLowerCase();
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("ar")) return "ar";
  return "en";
}

function mapJobExperienceLabel(value: string, locale: "en" | "fr" | "ar"): string {
  const key = value.toLowerCase();
  if (locale === "fr") {
    if (key === "mid_level") return "Intermediaire";
    if (key === "junior") return "Junior";
    if (key === "senior") return "Senior";
    return value;
  }
  if (locale === "ar") {
    if (key === "mid_level") return "متوسط";
    if (key === "junior") return "مبتدئ";
    if (key === "senior") return "متقدم";
    return value;
  }
  if (key === "mid_level") return "Mid level";
  if (key === "junior") return "Junior";
  if (key === "senior") return "Senior";
  return value;
}

function mapLocationRequirementLabel(value: string, locale: "en" | "fr" | "ar"): string {
  const key = value.toLowerCase();
  if (locale === "fr") {
    if (key === "in_office") return "Presentiel";
    if (key === "hybrid") return "Hybride";
    if (key === "remote") return "A distance";
    return value;
  }
  if (locale === "ar") {
    if (key === "in_office") return "حضوري";
    if (key === "hybrid") return "هجين";
    if (key === "remote") return "عن بعد";
    return value;
  }
  if (key === "in_office") return "On-site";
  if (key === "hybrid") return "Hybrid";
  if (key === "remote") return "Remote";
  return value;
}

function buildResultsSummary(params: {
  type: TabType;
  items: any[];
  query: string;
  locale: string;
}): string {
  const { type, items, query, locale } = params;
  const l = normalizeLocaleForSummary(locale);
  if (!items.length) return "";

  if (type === "jobs") {
    const first = items[0];
    const cities = Array.from(new Set(items.map((i) => i.city).filter(Boolean)));
    const levels = Array.from(new Set(items.map((i) => i.experienceLevel).filter(Boolean))).map((v) =>
      mapJobExperienceLabel(String(v), l),
    );
    const locations = Array.from(
      new Set(items.map((i) => i.locationRequirement).filter(Boolean)),
    ).map((v) => mapLocationRequirementLabel(String(v), l));
    const wages = items.map((i) => Number(i.wage)).filter((v) => Number.isFinite(v));
    const wageInfo =
      wages.length > 0
        ? `${Math.min(...wages)} - ${Math.max(...wages)} MAD`
        : l === "fr"
          ? "Non precise"
          : l === "ar"
            ? "غير محدد"
            : "Not specified";

    if (l === "fr") {
      return [
        `## Resultats pour "${query}"`,
        `- **Meilleure correspondance:** ${first?.title ?? "Resultat principal"}${first?.city ? ` (${first.city})` : ""}.`,
        `- **Niveau d'experience:** ${levels.length ? levels.join(", ") : "Non precise"}.`,
        `- **Mode de travail:** ${locations.length ? locations.join(", ") : "Non precise"}.`,
        `- **Salaire:** ${wageInfo}.`,
        `- **Ville(s):** ${cities.length ? cities.join(", ") : "Non precise"}.`,
      ].join("\n");
    }
    if (l === "ar") {
      return [
        `## نتائج "${query}"`,
        `- **أفضل تطابق:** ${first?.title ?? "أفضل نتيجة"}${first?.city ? ` (${first.city})` : ""}.`,
        `- **مستوى الخبرة:** ${levels.length ? levels.join("، ") : "غير محدد"}.`,
        `- **نمط العمل:** ${locations.length ? locations.join("، ") : "غير محدد"}.`,
        `- **الأجر:** ${wageInfo}.`,
        `- **المدينة/المدن:** ${cities.length ? cities.join("، ") : "غير محدد"}.`,
      ].join("\n");
    }
    return [
      `## Results for "${query}"`,
      `- **Top match:** ${first?.title ?? "Top result"}${first?.city ? ` (${first.city})` : ""}.`,
      `- **Experience level:** ${levels.length ? levels.join(", ") : "Not specified"}.`,
      `- **Work setup:** ${locations.length ? locations.join(", ") : "Not specified"}.`,
      `- **Salary signal:** ${wageInfo}.`,
      `- **City coverage:** ${cities.length ? cities.join(", ") : "Not specified"}.`,
    ].join("\n");
  }

  if (type === "services") {
    const first = items[0];
    const cities = Array.from(new Set(items.map((i) => i.city).filter(Boolean)));
    const prices = items.map((i) => Number(i.price)).filter((v) => Number.isFinite(v));
    const priceInfo =
      prices.length > 0
        ? `${Math.min(...prices)} - ${Math.max(...prices)} MAD`
        : l === "fr"
          ? "Non precise"
          : l === "ar"
            ? "غير محدد"
            : "Not specified";
    if (l === "fr") {
      return [
        `## Services pour "${query}"`,
        `- **Meilleure option:** ${first?.title ?? "Resultat principal"}${first?.city ? ` (${first.city})` : ""}.`,
        `- **Categorie:** ${first?.serviceCategory ?? "Non precise"}.`,
        `- **Prix:** ${priceInfo}.`,
        `- **Ville(s):** ${cities.length ? cities.join(", ") : "Non precise"}.`,
      ].join("\n");
    }
    if (l === "ar") {
      return [
        `## خدمات "${query}"`,
        `- **أفضل خيار:** ${first?.title ?? "أفضل نتيجة"}${first?.city ? ` (${first.city})` : ""}.`,
        `- **الفئة:** ${first?.serviceCategory ?? "غير محدد"}.`,
        `- **السعر:** ${priceInfo}.`,
        `- **المدينة/المدن:** ${cities.length ? cities.join("، ") : "غير محدد"}.`,
      ].join("\n");
    }
    return [
      `## Services for "${query}"`,
      `- **Top option:** ${first?.title ?? "Top result"}${first?.city ? ` (${first.city})` : ""}.`,
      `- **Category:** ${first?.serviceCategory ?? "Not specified"}.`,
      `- **Price signal:** ${priceInfo}.`,
      `- **City coverage:** ${cities.length ? cities.join(", ") : "Not specified"}.`,
    ].join("\n");
  }

  const first = items[0];
  const cities = Array.from(new Set(items.map((i) => i.city).filter(Boolean)));
  const budgets = items.map((i) => Number(i.budget)).filter((v) => Number.isFinite(v));
  const budgetInfo =
    budgets.length > 0
      ? `${Math.min(...budgets)} - ${Math.max(...budgets)} MAD`
      : l === "fr"
        ? "Non precise"
        : l === "ar"
          ? "غير محدد"
          : "Not specified";
  if (l === "fr") {
    return [
      `## Taches pour "${query}"`,
      `- **Meilleure option:** ${first?.title ?? "Resultat principal"}${first?.city ? ` (${first.city})` : ""}.`,
      `- **Categorie:** ${first?.category ?? "Non precise"}.`,
      `- **Budget:** ${budgetInfo}.`,
      `- **Ville(s):** ${cities.length ? cities.join(", ") : "Non precise"}.`,
    ].join("\n");
  }
  if (l === "ar") {
    return [
      `## مهام "${query}"`,
      `- **أفضل خيار:** ${first?.title ?? "أفضل نتيجة"}${first?.city ? ` (${first.city})` : ""}.`,
      `- **الفئة:** ${first?.category ?? "غير محدد"}.`,
      `- **الميزانية:** ${budgetInfo}.`,
      `- **المدينة/المدن:** ${cities.length ? cities.join("، ") : "غير محدد"}.`,
    ].join("\n");
  }
  return [
    `## Tasks for "${query}"`,
    `- **Top option:** ${first?.title ?? "Top result"}${first?.city ? ` (${first.city})` : ""}.`,
    `- **Category:** ${first?.category ?? "Not specified"}.`,
    `- **Budget signal:** ${budgetInfo}.`,
    `- **City coverage:** ${cities.length ? cities.join(", ") : "Not specified"}.`,
  ].join("\n");
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
  const [pinnedIntent, setPinnedIntent] = useState<TabType | null>(null);
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
    categoryHint?: string;
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
          categoryHint: opts.categoryHint,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Chat API error ${res.status}`);
    }
    const json = (await res.json()) as AgentResponse;
    console.log("[chat-ui] /api/chat response", {
      action: json?.action,
      intent: json?.intent,
      searchQuery: json?.searchQuery,
      hasResults: !!json?.results,
      resultType: json?.results?.type,
      resultCount: Array.isArray(json?.results?.items) ? json.results.items.length : 0,
      relatedPromptsCount: Array.isArray(json?.relatedPrompts) ? json.relatedPrompts.length : 0,
      debug: json?.debug ?? null,
    });
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
    // Include both enum key and human-readable label to improve multilingual prompt matching.
    return `${intent} category: ${raw}${humanized && humanized !== raw ? ` (${humanized})` : ""}`;
  };

  const callResultsSummary = async (opts: {
    locale: string;
    intent: AgentIntent;
    query: string;
    items: any[];
  }): Promise<string> => {
    const compactItems = opts.items.slice(0, SEARCH_PAGE_SIZE).map((item: any) => {
      if (opts.intent === "jobs") {
        return {
          title: item?.title ?? null,
          companyName: item?.companyName ?? null,
          city: item?.city ?? null,
          experienceLevel: item?.experienceLevel ?? null,
          locationRequirement: item?.locationRequirement ?? null,
          wage: item?.wage ?? null,
          type: item?.type ?? null,
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
        };
      }
      return {
        title: item?.title ?? null,
        category: item?.category ?? null,
        city: item?.city ?? null,
        budget: item?.budget ?? null,
        status: item?.status ?? null,
      };
    });

    const res = await fetch("/api/chat/results-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: opts.locale,
        intent: opts.intent,
        query: opts.query,
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

  const handlePromptSelection = (prompt: string, upgradeUrl?: string) => {
    const normalized = prompt.trim().toLowerCase();
    if (normalized === "plans" || normalized === "plan" || normalized === "pricing") {
      router.push(upgradeUrl || "/subscription");
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
        if (prev && prev !== next) {
          setSelectedCategory(undefined);
        }
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
      // In chat mode, category chips are used to generate prompts, not hard-filter results.
      category: undefined,
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
      // In chat mode, category chips are used to generate prompts, not hard-filter results.
      serviceCategory: undefined,
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
      // In chat mode, category chips are used to generate prompts, not hard-filter results.
      category: undefined,
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

  useEffect(() => {
    if (!hasSearched || !submittedQuery.trim() || !submittedResultsKey) return;
    if (topSearchLoading || topSearchItems.length === 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const summary = await callResultsSummary({
          locale,
          intent: activeTab,
          query: submittedQuery,
          items: topSearchItems,
        });
        if (cancelled || !summary) return;
        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.results) return msg;
            if (msg.results.key !== submittedResultsKey) return msg;
            return {
              ...msg,
              content: summary,
            };
          }),
        );
      } catch {
        // If summarization API fails, keep a deterministic local fallback.
        const fallback = buildResultsSummary({
          type: activeTab,
          items: topSearchItems,
          query: submittedQuery,
          locale,
        });
        if (cancelled || !fallback) return;
        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.results) return msg;
            if (msg.results.key !== submittedResultsKey) return msg;
            return {
              ...msg,
              content: fallback,
            };
          }),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasSearched, submittedQuery, submittedResultsKey, topSearchLoading, topSearchItems, locale, activeTab]);

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
          content: t("labels.related"),
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
        const categoryHint =
          pinnedIntent && activeTab === pinnedIntent
            ? buildCategoryHint(pinnedIntent, String(selectedCategory ?? ""))
            : undefined;
        const agent = await callSearchAgent({ query: effectiveQuery, locale, scope: currentScope, categoryHint });
        const tab: TabType = pinnedIntent ?? agent.intent;
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
      const categoryHint =
        pinnedIntent && activeTab === pinnedIntent
          ? buildCategoryHint(pinnedIntent, String(selectedCategory ?? ""))
          : undefined;
      const agent = await callSearchAgent({ query: effectiveQuery, locale, scope: currentScope, categoryHint });
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
              content: t("labels.related"),
              relatedPrompts: agent.relatedPrompts,
              upgradeUrl: agent.upgradeUrl,
            },
          ]);
        }
        return;
      }

      const tab: TabType = pinnedIntent ?? agent.intent;
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

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  thinking: false,
                  kind: "results",
                  content: agent.assistantText ?? "",
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

        if (Array.isArray(agent.relatedPrompts) && agent.relatedPrompts.length > 0) {
          const suggestionsId = nextMessageIdRef.current++;
          setMessages((prev) => [
            ...prev,
            {
              id: suggestionsId,
              role: "assistant",
              kind: "suggestions",
              content: t("labels.related"),
              relatedPrompts: agent.relatedPrompts,
              suggestionsForKey: resultsKey,
            },
          ]);
        }
        return;
      }

      setActiveTab(tab);
      setSubmittedQuery(q);
      if (!pinnedIntent) setSelectedCategory(undefined);
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
                content: agent.assistantText ?? "",
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
    <div className={`mx-auto w-full max-w-none text-left md:max-w-4xl ${chatExpanded ? "h-full min-h-0" : ""}`}>
      {/* Search Content - Chat interface */}
      <div className={`px-0 md:px-6 md:pb-0 ${chatExpanded ? "h-full min-h-0" : ""}`}>
        <div className={`mx-auto flex w-full flex-col gap-4 ${chatExpanded ? "h-full min-h-0" : ""}`}>
          <AgentChatContainer
            chatExpanded={chatExpanded}
            messages={messages}
            chatInput={chatInput}
                    placeholder={placeholder || t("placeholder")}
            dir={dir}
            isSearching={isSearching}
            isAgentWorking={isAgentWorking}
            pinnedIntent={pinnedIntent}
            userInitial={session?.user?.name?.slice(0, 1)?.toUpperCase() || "U"}
            chatInputRef={chatInputRef}
            labels={{
              searching: t("searching"),
              thinking: t("thinking"),
              noResults: t("messages.noResults"),
              related: t("labels.related"),
              jobs: t("tabs.jobs"),
              services: t("tabs.services"),
              tasks: t("tabs.tasks"),
            }}
            onInputChange={setChatInput}
            onSubmit={() => {
                        void handleSearch();
            }}
            onPinnedIntentClear={() => {
              setPinnedIntent(null);
              setSelectedCategory(undefined);
            }}
            onSuggestionSelect={handlePromptSelection}
          />

          {/* Prompt shortcuts (like before) */}
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
