"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useMessages } from "next-intl";
import { trpc } from "@/app/_trpc/client";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import { Badge } from "@workspace/ui/components/badge";
import { toast } from "sonner";
import {
  Loader2,
  Check,
  Pause,
  Play,
  ShieldCheck,
  Clock,
  Sparkles,
  Send,
  SlidersHorizontal,
  Zap,
  X,
} from "lucide-react";

import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { jobCategoryIcons } from "@/components/ui/config/job-filters-config";

import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";
import rolesByCategory from "@workspace/ui/data/auto-apply-roles.json";
import { AutoApplyListingGrid } from "@/app/jobs/auto-apply/auto-apply-listing-grid";

type JobCategory = (typeof jobCategoryValues)[number];

export default function AutoApplySettingsPage() {
  const router = useRouter();
  const tA = useTranslations("AutoApply");
  const tAll = useTranslations();
  const messages = useMessages() as any;

  const { data: subscription, isLoading: subLoading } =
    trpc.auth.getUserSubscriptionStatus.useQuery();

  const { data, refetch } = trpc.auth.getAutoApplyPrefs.useQuery(undefined, {
    enabled: !!subscription?.eligible,
  });
  const mutation = trpc.auth.updateAutoApplyPrefs.useMutation();

  const { data: stats, refetch: refetchStats } =
    trpc.auth.getAutoApplyStats.useQuery(undefined, {
      enabled: !!subscription?.eligible,
    });

  const { data: usage } = trpc.subscription.getUsageStats.useQuery(undefined, {
    enabled: !!subscription?.eligible,
  });

  const [enabled, setEnabled] = useState(false);
  const [category, setCategory] = useState<JobCategory | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    if (data) {
      setEnabled(!!data.autoApplyEnabled);
      setCategory(data.autoApplyCategory ?? null);
      setKeywords(data.autoApplyKeywords ?? []);
      setRoles((data as any).autoApplyRoles ?? []);
    }
  }, [data]);

  const suggestions = useMemo<string[]>(() => {
    return category ? ((keywordsByCategory as any)[category] ?? []) : [];
  }, [category]);

  const roleSuggestions = useMemo<string[]>(() => {
    return category ? ((rolesByCategory as any)[category] ?? []) : [];
  }, [category]);

  const appliedCount = usage?.autoAppliedUsed ?? stats?.appliedCount ?? 0;
  const cap = usage?.autoApplyLimit ?? null;
  const pct = cap ? Math.min((appliedCount / cap) * 100, 100) : 0;
  const lastApplied = stats?.recent?.[0]?.createdAt
    ? new Date(stats.recent[0].createdAt)
    : null;

  // Count applied today
  const appliedToday = useMemo(() => {
    if (!stats?.recent) return 0;
    const today = new Date();
    return stats.recent.filter((r: any) => {
      const d = new Date(r.createdAt);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    }).length;
  }, [stats]);

  const handleToggle = async (nextEnabled: boolean) => {
    setEnabled(nextEnabled);
    try {
      await mutation.mutateAsync({ enabled: nextEnabled, category, keywords, roles });
      toast.success(nextEnabled ? tA("hero.resumed") : tA("hero.paused"));
      refetch();
      refetchStats();
    } catch (e: any) {
      setEnabled(!nextEnabled);
      toast.error(e?.message || tA("toasts.saveFailed"));
    }
  };

  const savePrefs = async () => {
    try {
      await mutation.mutateAsync({ enabled, category, keywords, roles });
      toast.success(tA("toasts.saved"));
      refetch();
      refetchStats();
      setPrefsOpen(false);
    } catch (e: any) {
      toast.error(e?.message || tA("toasts.saveFailed"));
    }
  };

  const addKeyword = (value: string) => {
    const next = value.trim();
    if (!next) return;
    if (!keywords.includes(next)) {
      setKeywords((prev) => [...prev, next]);
    }
    setCustomTag("");
  };

  if (subLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subscription?.eligible) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
        <h2 className="text-2xl font-semibold text-black">{tA("locked.title")}</h2>
        <p className="max-w-md text-muted-foreground">{tA("locked.subtitle")}</p>
        <Button
          onClick={() => router.push("/subscription")}
          className="text-white bg-black transition hover:bg-black/80"
        >
          {tA("locked.viewPlans")}
        </Button>
      </div>
    );
  }

  const PreferencesPanel = (
    <div className="space-y-6">
      {/* Category */}
      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {tA("category.title")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {jobCategoryValues.map((c) => {
            const Icon = jobCategoryIcons[c as keyof typeof jobCategoryIcons];
            const selected = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                  selected
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {tAll(`Enums.JobCategory.${c}`)}
                {selected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Roles */}
      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {tA("roles.title")}
        </Label>
        {category ? (
          <div className="flex flex-wrap gap-2">
            {roleSuggestions.map((r) => {
              const selected = roles.includes(r);
              const slug = r
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
              const label =
                messages?.AutoApply?.roles && slug in messages.AutoApply.roles
                  ? tA(`roles.${slug}`)
                  : r;
              return (
                <button
                  key={r}
                  onClick={() =>
                    setRoles((prev) =>
                      selected ? prev.filter((x) => x !== r) : [...prev, r]
                    )
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {selected && <Check className="w-3 h-3" />}
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">{tA("roles.emptyHint")}</p>
        )}
      </div>

      {/* Keywords */}
      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {tA("keywords.title")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {keywords.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold"
            >
              {tag}
              <button
                onClick={() => setKeywords((prev) => prev.filter((k) => k !== tag))}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder={tA("keywords.placeholder")}
            className="flex-1 bg-slate-50 border-slate-100 rounded-xl text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword(customTag);
              }
            }}
          />
          <Button
            variant="secondary"
            onClick={() => addKeyword(customTag)}
            className="rounded-xl shrink-0"
          >
            {tA("keywords.add")}
          </Button>
        </div>
        {category && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((tag) => {
              const selected = keywords.includes(tag);
              const slug = tag
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
              const label =
                messages?.AutoApply?.keywords && slug in messages.AutoApply.keywords
                  ? tA(`keywords.${slug}`)
                  : tag;
              return (
                <button
                  key={tag}
                  onClick={() =>
                    setKeywords((prev) =>
                      selected ? prev.filter((k) => k !== tag) : [...prev, tag]
                    )
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {selected && <Check className="w-3 h-3" />}
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Save */}
      <Button
        onClick={savePrefs}
        disabled={mutation.isPending}
        className="w-full bg-slate-900 text-white rounded-2xl py-5 font-bold text-sm hover:bg-slate-800 transition-all active:scale-95"
      >
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : null}
        {tA("save")}
      </Button>
    </div>
  );

  return (
    <div className="bg-[#F6F8FA] min-h-screen px-4 py-8 md:px-6 lg:px-8 lg:py-12 space-y-10">
      {/* ── Header ── */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        {/* Left: title + status pill */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              {tA("hero.reassurance")}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              {tA("hero.title")}
            </h1>
            <p className="text-slate-500 text-base md:text-lg">
              {tA("hero.subtitle")}
            </p>
          </div>

          {/* Agent status pill */}
          <div className="flex items-center gap-3 bg-white pl-5 pr-2 py-2 rounded-full shadow-sm border border-slate-100 w-fit">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    enabled ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    enabled ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
              </span>
              <span className="text-sm font-bold text-slate-900 tracking-tight">
                {enabled ? tA("hero.active") : tA("hero.paused")}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-100 mx-1" />
            <Button
              onClick={() => handleToggle(!enabled)}
              disabled={mutation.isPending}
              size="sm"
              variant="ghost"
              className="rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold border border-slate-200 px-4"
            >
              {mutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : enabled ? (
                <Pause className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <Play className="w-3.5 h-3.5 mr-1.5" />
              )}
              {enabled ? tA("hero.pause") : tA("hero.resume")}
            </Button>
          </div>
        </div>

        {/* Right: 3 stat cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Applied */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <Send className="w-5 h-5" />
              </span>
              {appliedToday > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-full">
                  +{appliedToday} {tA("activity.today")}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm font-medium">{tA("stats.autoApplied")}</p>
            <h3 className="text-3xl font-extrabold mt-1 text-slate-900">{appliedCount}</h3>
          </div>

          {/* Last Applied */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <Clock className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-bold text-slate-500 px-2 py-1 bg-slate-50 rounded-full border border-slate-100">
                {enabled ? tA("activity.alive") : tA("hero.paused")}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{tA("activity.lastAppliedLabel")}</p>
            <h3 className="text-xl font-extrabold mt-1 text-slate-900">
              {lastApplied
                ? lastApplied.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : tA("activity.noApplications")}
            </h3>
          </div>

          {/* Monthly Limit — dark card */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-sm font-medium text-white/60">
                {cap != null ? tA("stats.progress", { used: appliedCount, cap }) : tAll("Billing.unlimited")}
              </p>
              <h3 className="text-4xl font-extrabold mt-2 text-white">
                {appliedCount}
                {cap != null && (
                  <span className="text-lg font-medium text-white/40 ml-1">/ {cap}</span>
                )}
              </h3>
              <Progress
                value={pct}
                className="w-full bg-white/10 h-1.5 rounded-full mt-4 [&>[data-slot=progress-indicator]]:bg-red-500"
              />
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Sparkles className="w-24 h-24" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar: Preferences */}
        <aside className="lg:col-span-4">
          {/* Mobile toggle */}
          <div className="lg:hidden mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{tA("prefs.title")}</h2>
            <Button variant="ghost" size="sm" onClick={() => setPrefsOpen((v) => !v)}>
              <SlidersHorizontal className="w-4 h-4 mr-1.5" />
              {prefsOpen ? tA("prefs.hide") : tA("prefs.edit")}
            </Button>
          </div>

          {/* Desktop: always visible / Mobile: toggleable */}
          <section
            className={`bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8 ${
              prefsOpen ? "block" : "hidden lg:block"
            }`}
          >
            <div className="hidden lg:flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">{tA("prefs.title")}</h2>
              <SlidersHorizontal className="w-5 h-5 text-slate-400" />
            </div>
            <p className="hidden lg:block text-sm text-slate-500 -mt-4">{tA("prefs.hint")}</p>
            {PreferencesPanel}
          </section>
        </aside>

        {/* Main content: job matches */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                {tA("listing.title")}
              </h2>
              <p className="text-slate-500 mt-1 font-medium text-sm">
                {tA("listing.subtitle")}
              </p>
            </div>
          </div>

          <AutoApplyListingGrid
            enabled={enabled}
            category={category}
            keywords={keywords}
            roles={roles}
          />
        </section>
      </div>
    </div>
  );
}
