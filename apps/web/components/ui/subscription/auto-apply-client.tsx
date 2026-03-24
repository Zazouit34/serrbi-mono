"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useMessages } from "next-intl";
import { trpc } from "@/app/_trpc/client";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Dialog,
  DialogContent,
} from "@workspace/ui/components/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Check,
  Pause,
  Play,
  Clock,
  Sparkles,
  Send,
  Plus,
  X,
  ShieldCheck,
  Brain,
  SlidersHorizontal,
} from "lucide-react";

import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { jobCategoryIcons } from "@/components/ui/config/job-filters-config";

import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";
import rolesByCategory from "@workspace/ui/data/auto-apply-roles.json";
import { AutoApplyListingGrid } from "@/app/jobs/auto-apply/auto-apply-listing-grid";

type JobCategory = (typeof jobCategoryValues)[number];

// ── Small toggle row for Automation Logic ────────────────────────────
function ToggleRow({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-[1.5rem] group hover:border-slate-300 transition-all shadow-sm">
      <div className="flex gap-3 items-center">
        <div className="flex justify-center items-center w-9 h-9 rounded-xl bg-slate-50 shrink-0">
          <Icon className="w-4 h-4 text-slate-700" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-slate-900">{label}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{hint}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative flex items-center transition-colors shrink-0 ml-4 ${
          checked ? "justify-end bg-slate-900" : "justify-start bg-slate-200"
        } px-1`}
        aria-checked={checked}
        role="switch"
      >
        <span className="w-4 h-4 bg-white rounded-full shadow-sm transition-all" />
      </button>
    </div>
  );
}

// ── Compact chip list with Popover "+" ───────────────────────────────
function ChipSection({
  label,
  dotColor,
  selected,
  allOptions,
  getLabel,
  onToggle,
  renderChip,
}: {
  label: string;
  dotColor: "red" | "slate";
  selected: string[];
  allOptions: string[];
  getLabel: (v: string) => string;
  onToggle: (v: string) => void;
  renderChip?: (v: string, isSelected: boolean) => React.ReactNode;
}) {
  const MAX_VISIBLE = 3;
  const visibleChips = selected.slice(0, MAX_VISIBLE);
  const hiddenOptions = allOptions.filter((o) => !selected.includes(o));
  const extraSelected = selected.slice(MAX_VISIBLE);

  return (
    <div className="space-y-3">
      <label className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            dotColor === "red" ? "bg-red-500" : "bg-slate-300"
          }`}
        />
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {visibleChips.map((v) =>
          renderChip ? (
            renderChip(v, true)
          ) : (
            <button
              key={v}
              onClick={() => onToggle(v)}
              className="flex gap-2 items-center py-2 pr-3 pl-4 text-sm font-bold text-white rounded-2xl shadow-sm transition-all bg-slate-900 hover:bg-slate-800"
            >
              {getLabel(v)}
              <X className="w-3 h-3 opacity-70" />
            </button>
          )
        )}

        {/* Overflow indicator */}
        {extraSelected.length > 0 && (
          <span className="flex items-center px-3 py-2 text-xs font-bold rounded-2xl border bg-slate-100 text-slate-600 border-slate-200">
            +{extraSelected.length}
          </span>
        )}

        {/* Add more popover */}
        {(hiddenOptions.length > 0 || selected.length === 0) && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex justify-center items-center w-10 h-10 rounded-2xl border transition-all bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <Plus className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="p-4 w-72 rounded-2xl border shadow-xl border-slate-100"
              align="start"
            >
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                {label}
              </p>
              <div className="flex overflow-y-auto flex-wrap gap-2 max-h-52">
                {allOptions.map((v) => {
                  const isSelected = selected.includes(v);
                  return (
                    <button
                      key={v}
                      onClick={() => onToggle(v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {getLabel(v)}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
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
  const [strictMatch, setStrictMatch] = useState(false);
  const [smartOutreach, setSmartOutreach] = useState(true);
  const [showMobilePrefs, setShowMobilePrefs] = useState(false);

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
    if (!next || keywords.includes(next)) return;
    setKeywords((prev) => [...prev, next]);
    setCustomTag("");
  };

  const toggleKeyword = (tag: string) =>
    setKeywords((prev) =>
      prev.includes(tag) ? prev.filter((k) => k !== tag) : [...prev, tag]
    );

  const toggleRole = (r: string) =>
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );

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

  const getCategoryLabel = (c: string) => tAll(`Enums.JobCategory.${c}`);
  const getRoleLabel = (r: string) => {
    const slug = r.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return messages?.AutoApply?.roles && slug in messages.AutoApply.roles
      ? tA(`roles.${slug}`)
      : r;
  };
  const getKeywordLabel = (tag: string) => {
    const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return messages?.AutoApply?.keywords && slug in messages.AutoApply.keywords
      ? tA(`keywords.${slug}`)
      : tag;
  };

  return (
    <div className="px-4 py-6 space-y-6 md:px-8 md:py-10 lg:py-14 lg:space-y-10">
      {/* ── Row 1: Title + subtitle ── */}
      <div className="space-y-1">
        <h1 className="text-xl font-extrabold tracking-tight md:text-4xl lg:text-5xl text-slate-900">
          {tA("hero.title")}
        </h1>
        <p className="max-w-2xl text-xs font-medium md:text-lg text-slate-500">
          {tA("hero.subtitle")}
        </p>
      </div>

      {/* ── Row 2: 4 metric cards — horizontal scroll on mobile, grid on desktop ── */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-none lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:pb-0">
        {/* Agent Status */}
        <div className="snap-start min-w-[260px] bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between gap-4 lg:min-w-0">
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
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
              <span className="text-sm font-bold text-slate-900">
                {enabled ? tA("hero.active") : tA("hero.paused")}
              </span>
            </div>
            <p className="text-xs font-medium leading-relaxed text-slate-400 line-clamp-2">
              {tA("hero.reassurance")}
            </p>
          </div>
          <Button
            onClick={() => handleToggle(!enabled)}
            disabled={mutation.isPending}
            variant="outline"
            className="py-5 w-full text-sm font-bold rounded-2xl border-slate-200 hover:bg-slate-50"
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : enabled ? (
              <Pause className="mr-2 w-4 h-4" />
            ) : (
              <Play className="mr-2 w-4 h-4" />
            )}
            {enabled ? tA("hero.pause") : tA("hero.resume")}
          </Button>
        </div>

        {/* Total Applied */}
        <div className="snap-start min-w-[200px] bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm lg:min-w-0">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
              <Send className="w-4 h-4" />
            </span>
            {appliedToday > 0 && (
              <span className="text-[10px] font-black text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-full uppercase tracking-wider">
                +{appliedToday}
              </span>
            )}
          </div>
          <div className="mt-5">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              {tA("stats.autoApplied")}
            </p>
            <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              {appliedCount}
            </h3>
          </div>
        </div>

        {/* Last Applied */}
        <div className="snap-start min-w-[200px] bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm lg:min-w-0">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-black text-slate-400 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100 uppercase tracking-wider">
              {enabled ? tA("activity.alive") : tA("hero.paused")}
            </span>
          </div>
          <div className="mt-5">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              {tA("activity.lastAppliedLabel")}
            </p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
              {lastApplied
                ? lastApplied.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : tA("activity.noApplications")}
            </h3>
          </div>
        </div>

        {/* Monthly Limit — dark */}
        <div className="snap-start min-w-[200px] bg-slate-900 text-white p-5 rounded-[2rem] relative overflow-hidden flex flex-col justify-between lg:min-w-0">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                {cap != null
                  ? tA("stats.progress", { used: appliedCount, cap })
                  : tAll("Billing.unlimited")}
              </p>
              <Sparkles className="w-4 h-4 text-white/30" />
            </div>
            <h3 className="text-3xl font-extrabold tracking-tight text-white">
              {appliedCount}
              {cap != null && (
                <span className="text-base font-medium text-white/30 ml-1.5">/ {cap}</span>
              )}
            </h3>
            <Progress
              value={pct}
              className="w-full bg-white/10 h-1.5 rounded-full mt-4 [&>[data-slot=progress-indicator]]:bg-red-500"
            />
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + listing (equal height) ── */}
      <div className="grid grid-cols-1 gap-10 items-stretch lg:grid-cols-12">
        {/* ── Sidebar: Preferences — hidden on mobile, desktop only ── */}
        <aside className="hidden lg:block lg:col-span-4 h-full">
          <section className="h-full bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center pb-6 mb-8 border-b border-slate-100">
              <div className="space-y-0.5">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {tA("prefs.title")}
                </h2>
                <p className="text-[11px] font-bold text-red-500 uppercase tracking-[0.2em]">
                  {tA("prefs.hint")}
                </p>
              </div>
              <div className="flex justify-center items-center w-11 h-11 rounded-2xl border bg-slate-50 border-slate-100 shrink-0">
                <SlidersHorizontal className="w-5 h-5 text-slate-700" />
              </div>
            </div>

            {/* Content — flex-grow so Save button stays at bottom */}
            <div className="flex flex-col flex-grow space-y-8">
              {/* Category */}
              <ChipSection
                label={tA("category.title")}
                dotColor="red"
                selected={category ? [category] : []}
                allOptions={jobCategoryValues as unknown as string[]}
                getLabel={getCategoryLabel}
                onToggle={(c) => setCategory(category === c ? null : (c as JobCategory))}
                renderChip={(c, _isSelected) => {
                  const Icon = jobCategoryIcons[c as keyof typeof jobCategoryIcons];
                  return (
                    <button
                      key={c}
                      onClick={() => setCategory(category === c ? null : (c as JobCategory))}
                      className="flex gap-2 items-center py-2 pr-3 pl-4 text-sm font-bold text-white rounded-2xl shadow-sm transition-all bg-slate-900 hover:bg-slate-800"
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {getCategoryLabel(c)}
                      <X className="w-3 h-3 opacity-70" />
                    </button>
                  );
                }}
              />

              {/* Roles */}
              <ChipSection
                label={tA("roles.title")}
                dotColor="slate"
                selected={roles}
                allOptions={roleSuggestions}
                getLabel={getRoleLabel}
                onToggle={toggleRole}
              />

              {/* Keywords */}
              <div className="space-y-3">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {tA("keywords.title")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {keywords.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="flex gap-2 items-center py-2 pr-3 pl-4 text-xs font-extrabold rounded-2xl border bg-slate-50 border-slate-200 text-slate-900"
                    >
                      {getKeywordLabel(tag)}
                      <button
                        onClick={() => setKeywords((prev) => prev.filter((k) => k !== tag))}
                        className="transition-colors text-slate-300 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {keywords.length > 3 && (
                    <span className="flex items-center px-3 py-2 text-xs font-bold rounded-2xl border bg-slate-100 text-slate-600 border-slate-200">
                      +{keywords.length - 3}
                    </span>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex justify-center items-center w-10 h-10 rounded-2xl border transition-all bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <Plus className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-4 w-80 rounded-2xl border shadow-xl border-slate-100"
                      align="start"
                    >
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                        {tA("keywords.title")}
                      </p>
                      {/* Suggestion chips */}
                      {suggestions.length > 0 && (
                        <div className="flex overflow-y-auto flex-wrap gap-2 mb-3 max-h-40">
                          {suggestions.map((tag) => {
                            const isSelected = keywords.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleKeyword(tag)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                                  isSelected
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                                {getKeywordLabel(tag)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {/* Custom input */}
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={customTag}
                          onChange={(e) => setCustomTag(e.target.value)}
                          placeholder={tA("keywords.placeholder")}
                          className="flex-1 text-sm rounded-xl"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addKeyword(customTag);
                            }
                          }}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => addKeyword(customTag)}
                          className="rounded-xl shrink-0"
                        >
                          {tA("prefs.addMore")}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Automation Logic toggles */}
              <div className="space-y-3">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  {tA("prefs.agentLogic")}
                </label>
                <ToggleRow
                  icon={ShieldCheck}
                  label={tA("hero.strictMatch")}
                  hint={tA("hero.strictMatchHint")}
                  checked={strictMatch}
                  onChange={setStrictMatch}
                />
                <ToggleRow
                  icon={Brain}
                  label={tA("hero.smartOutreach")}
                  hint={tA("hero.smartOutreachHint")}
                  checked={smartOutreach}
                  onChange={setSmartOutreach}
                />
              </div>

              {/* Save — pinned to bottom */}
              <div className="pt-6 mt-auto">
                <Button
                  onClick={savePrefs}
                  disabled={mutation.isPending}
                  className="w-full bg-slate-900 text-white rounded-2xl py-6 font-extrabold text-sm uppercase tracking-[0.15em] hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  {mutation.isPending && (
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  )}
                  {tA("save")}
                </Button>
              </div>
            </div>
          </section>
        </aside>

        {/* ── Main: job listing ── */}
        <section className="flex flex-col min-h-0 lg:col-span-8">
          <AutoApplyListingGrid
            enabled={enabled}
            category={category}
            keywords={keywords}
            roles={roles}
            strictMatch={strictMatch}
            smartOutreach={smartOutreach}
            onOpenPrefs={() => setShowMobilePrefs(true)}
          />
        </section>
      </div>

      {/* ── Mobile: preferences bottom-sheet modal ── */}
      <Dialog open={showMobilePrefs} onOpenChange={setShowMobilePrefs}>
        <DialogContent
          showCloseButton={false}
          className="lg:hidden bottom-0 left-0 right-0 top-auto max-w-full translate-x-0 translate-y-0 rounded-t-[2rem] rounded-b-none p-0 border-x-0 border-b-0 flex flex-col max-h-[90dvh] data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{tA("prefs.title")}</h2>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500 mt-0.5">
                {tA("prefs.hint")}
              </p>
            </div>
            <button
              onClick={() => setShowMobilePrefs(false)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Category */}
              <ChipSection
                label={tA("category.title")}
                dotColor="red"
                selected={category ? [category] : []}
                allOptions={jobCategoryValues as unknown as string[]}
                getLabel={getCategoryLabel}
                onToggle={(c) => setCategory(category === c ? null : (c as JobCategory))}
                renderChip={(c, _isSelected) => {
                  const Icon = jobCategoryIcons[c as keyof typeof jobCategoryIcons];
                  return (
                    <button
                      key={c}
                      onClick={() => setCategory(category === c ? null : (c as JobCategory))}
                      className="flex gap-2 items-center py-2 pr-3 pl-4 text-sm font-bold text-white rounded-2xl shadow-sm transition-all bg-slate-900 hover:bg-slate-800"
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {getCategoryLabel(c)}
                      <X className="w-3 h-3 opacity-70" />
                    </button>
                  );
                }}
              />
              <ChipSection
                label={tA("roles.title")}
                dotColor="slate"
                selected={roles}
                allOptions={roleSuggestions}
                getLabel={getRoleLabel}
                onToggle={toggleRole}
              />
              {/* Keywords */}
              <div className="space-y-3">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {tA("keywords.title")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {keywords.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="flex gap-2 items-center py-2 pr-3 pl-4 text-xs font-extrabold rounded-2xl border bg-slate-50 border-slate-200 text-slate-900"
                    >
                      {getKeywordLabel(tag)}
                      <button
                        onClick={() => setKeywords((prev) => prev.filter((k) => k !== tag))}
                        className="transition-colors text-slate-300 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {keywords.length > 3 && (
                    <span className="flex items-center px-3 py-2 text-xs font-bold rounded-2xl border bg-slate-100 text-slate-600 border-slate-200">
                      +{keywords.length - 3}
                    </span>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex justify-center items-center w-10 h-10 rounded-2xl border transition-all bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <Plus className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-4 w-72 rounded-2xl border shadow-xl border-slate-100" align="start">
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                        {tA("keywords.title")}
                      </p>
                      {suggestions.length > 0 && (
                        <div className="flex overflow-y-auto flex-wrap gap-2 mb-3 max-h-36">
                          {suggestions.map((tag) => {
                            const isSelected = keywords.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleKeyword(tag)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                                  isSelected
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                                {getKeywordLabel(tag)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={customTag}
                          onChange={(e) => setCustomTag(e.target.value)}
                          placeholder={tA("keywords.placeholder")}
                          className="flex-1 text-sm rounded-xl"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addKeyword(customTag); }
                          }}
                        />
                        <Button variant="secondary" size="sm" onClick={() => addKeyword(customTag)} className="rounded-xl shrink-0">
                          {tA("prefs.addMore")}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {/* Automation Logic toggles */}
              <div className="space-y-3">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  {tA("prefs.agentLogic")}
                </label>
                <ToggleRow
                  icon={ShieldCheck}
                  label={tA("hero.strictMatch")}
                  hint={tA("hero.strictMatchHint")}
                  checked={strictMatch}
                  onChange={setStrictMatch}
                />
                <ToggleRow
                  icon={Brain}
                  label={tA("hero.smartOutreach")}
                  hint={tA("hero.smartOutreachHint")}
                  checked={smartOutreach}
                  onChange={setSmartOutreach}
                />
              </div>
            </div>
          {/* Sticky save button */}
          <div className="px-6 py-4 border-t border-slate-100 shrink-0">
            <Button
              onClick={async () => { await savePrefs(); setShowMobilePrefs(false); }}
              disabled={mutation.isPending}
              className="w-full bg-slate-900 text-white rounded-2xl py-5 font-extrabold text-sm uppercase tracking-[0.15em] hover:bg-slate-800 active:scale-95 transition-all"
            >
              {mutation.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              {tA("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
