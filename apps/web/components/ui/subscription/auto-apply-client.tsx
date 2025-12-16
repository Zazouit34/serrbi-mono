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

  const statusLabel = enabled ? tA("hero.active") : tA("hero.paused");
  const statusTone = enabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Status hero */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={`${statusTone} border-transparent px-3 py-1 text-[12px]`}>
                <span className="inline-flex h-2 w-2 rounded-full bg-current opacity-80" />
                <span className="ml-2">{statusLabel}</span>
              </Badge>
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" />
                {tA("hero.reassurance")}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
              {tA("hero.title")}
            </h1>
            <p className="text-slate-300 max-w-2xl">
              {tA("hero.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => handleToggle(!enabled)}
              variant="secondary"
              className="bg-white text-slate-900 hover:bg-white/90"
              disabled={mutation.isPending}
            >
              {enabled ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  {tA("hero.pause")}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {tA("hero.resume")}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm text-slate-200">{tA("stats.autoApplied")}</div>
            <div className="text-2xl font-semibold mt-1">{appliedCount}</div>
            <p className="text-xs text-slate-300 mt-1">
              {cap != null ? tA("stats.progress", { used: appliedCount, cap }) : tAll("Billing.unlimited")}
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm text-slate-200 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {tA("activity.lastAppliedLabel")}
            </div>
            <div className="text-lg font-semibold mt-1">
              {lastApplied
                ? lastApplied.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : tA("activity.noApplications")}
            </div>
            <p className="text-xs text-slate-300 mt-1">{tA("activity.scanHint")}</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm text-slate-200 flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              {tA("hero.queue")}
            </div>
            <div className="text-lg font-semibold mt-1">
              {tA("listing.jobsInQueue", { count: Math.max(0, usage?.autoApplyLimit ?? 0) })}
            </div>
            <p className="text-xs text-slate-300 mt-1">{tA("hero.queueHint")}</p>
          </div>
        </div>
      </div>

      {/* Best matches elevated to top */}
      <div className="w-full md:rounded-3xl md:bg-white md:shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:border md:border-slate-100 md:p-6">
        <AutoApplyListingGrid enabled={enabled} category={category} keywords={keywords} roles={roles} />
      </div>

      {/* Activity panel */}
      <div className="rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] border border-slate-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{tA("activity.title")}</p>
            <h3 className="text-xl font-semibold text-slate-900">{tA("activity.subtitle")}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {tA("activity.alive")}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm text-slate-500">{tA("activity.appliedThisMonth")}</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{appliedCount}</p>
            <Progress value={pct} className="mt-2 h-2" />
            <p className="text-xs text-slate-500 mt-1">
              {cap != null ? tA("stats.progress", { used: appliedCount, cap }) : tAll("Billing.unlimited")}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {tA("activity.lastAppliedLabel")}
            </p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {lastApplied
                ? lastApplied.toLocaleString(undefined, { month: "short", day: "numeric" })
                : tA("activity.noApplications")}
            </p>
            <p className="text-xs text-slate-500 mt-1">{tA("activity.scanSoon")}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm text-slate-500">{tA("activity.statusTitle")}</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {enabled ? tA("activity.statusActive") : tA("activity.statusPaused")}
            </p>
            <p className="text-xs text-slate-500 mt-1">{tA("activity.statusCopy")}</p>
          </div>
        </div>
      </div>

      {/* Preferences as secondary control */}
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{tA("prefs.title")}</p>
            <h3 className="text-lg font-semibold text-slate-900">{tA("prefs.subtitle")}</h3>
            <p className="text-sm text-slate-500">{tA("prefs.hint")}</p>
          </div>
          <Button variant="ghost" onClick={() => setPrefsOpen((v) => !v)}>
            {prefsOpen ? tA("prefs.hide") : tA("prefs.edit")}
          </Button>
        </div>

        {prefsOpen && (
          <div className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-900">{tA("category.title")}</Label>
              <div className="flex flex-wrap gap-2">
                {jobCategoryValues.map((c) => {
                  const Icon = jobCategoryIcons[c as keyof typeof jobCategoryIcons];
                  const selected = category === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                        selected
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
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

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-900">{tA("roles.title")}</Label>
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
                          setRoles((prev) => (selected ? prev.filter((x) => x !== r) : [...prev, r]))
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                          selected
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{tA("roles.emptyHint")}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-900">{tA("keywords.title")}</Label>
              <div className="flex flex-wrap gap-2">
                {keywords.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-slate-200 bg-slate-50 text-slate-700"
                  >
                    {tag}
                    <button
                      className="ml-2 text-slate-500"
                      onClick={() => setKeywords((prev) => prev.filter((k) => k !== tag))}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder={tA("keywords.placeholder")}
                  className="w-full sm:w-80"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword(customTag);
                    }
                  }}
                />
                <Button variant="secondary" onClick={() => addKeyword(customTag)}>
                  {tA("keywords.add")}
                </Button>
              </div>
              {category && (
                <div className="flex flex-wrap gap-2">
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
                          setKeywords((prev) => (selected ? prev.filter((k) => k !== tag) : [...prev, tag]))
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                          selected
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
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

            <div className="flex justify-end">
              <Button onClick={savePrefs} disabled={mutation.isPending} className="bg-slate-900 text-white">
                {tA("save")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
