"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useMessages } from "next-intl";
import { trpc } from "@/app/_trpc/client";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { jobCategoryIcons } from "@/components/ui/config/job-filters-config";
import { formatJobCategory } from "@workspace/ui/lib/formatter";
import {
  Tags,
  TagsTrigger,
  TagsValue,
  TagsContent,
  TagsInput,
  TagsList,
  TagsEmpty,
  TagsGroup,
  TagsItem,
} from "@workspace/ui/components/ui/shadcn-io/tags";
import { Progress } from "@workspace/ui/components/progress";

import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";
import rolesByCategory from "@workspace/ui/data/auto-apply-roles.json";

type JobCategory = (typeof jobCategoryValues)[number];

export default function AutoApplySettingsPage() {
  const router = useRouter();
  const tA = useTranslations("AutoApply");
  const tAll = useTranslations();
  const messages = useMessages() as any;

  // ✅ Always call hooks — no conditions here
  const { data: subscription, isLoading: subLoading } =
    trpc.auth.getUserSubscriptionStatus.useQuery();

  const { data, refetch } = trpc.auth.getAutoApplyPrefs.useQuery(undefined, {
    enabled: !!subscription?.eligible, // only runs when eligible
  });
  const mutation = trpc.auth.updateAutoApplyPrefs.useMutation();

  const { data: stats, refetch: refetchStats } =
    trpc.auth.getAutoApplyStats.useQuery(undefined, {
      enabled: !!subscription?.eligible, // only runs when eligible
    });

  // ✅ Hooks always consistent
  const [enabled, setEnabled] = useState(false);
  const [category, setCategory] = useState<JobCategory | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [roles, setRoles] = useState<string[]>([]);

  // Tag handlers
  const addTag = (t: string) => {
    if (!t) return;
    if (!keywords.includes(t)) setKeywords([...keywords, t]);
    setTagInput("");
  };
  const removeTag = (t: string) => setKeywords(keywords.filter((k) => k !== t));

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

  const save = async () => {
    try {
      await mutation.mutateAsync({ enabled, category, keywords, roles });
      toast.success(tA("toasts.saved"));
      refetch();
      refetchStats();
    } catch (e: any) {
      toast.error(e?.message || tA("toasts.saveFailed"));
    }
  };

  // Progress bar — purely visual
  const displayCap = 20;
  const appliedCount = stats?.appliedCount ?? 0;
  const pct = Math.min((appliedCount / displayCap) * 100, 100);

  // 🌀 While checking subscription
  if (subLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 🚫 Not eligible — safe to conditionally render *after* hooks
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

  // ✅ Eligible user — show normal UI
  return (
    <div className="space-y-6 max-w-2xl">
      {/* 🔘 Auto-apply toggle */}
      <div className="flex justify-between items-center p-4 rounded-xl border shadow-sm backdrop-blur-sm bg-white/70">
        <div>
          <Label
            htmlFor="auto-apply"
            className="text-base font-medium text-black"
          >
            {tA("toggle.title")}
          </Label>
          <p className="text-sm text-muted-foreground">{tA("toggle.subtitle")}</p>
        </div>
        <Switch
          id="auto-apply"
          checked={enabled}
          onCheckedChange={(v: boolean) => setEnabled(v)}
        />
      </div>

      <hr className="my-6 border-t border-gray-200" />

      {/* 🧩 Job Categories */}
      <div className="space-y-3">
        <Label className="text-base font-medium text-black">{tA("category.title")}</Label>
        <div className="flex flex-wrap gap-2">
          {jobCategoryValues.map((c) => {
            const Icon = jobCategoryIcons[c as keyof typeof jobCategoryIcons];
            const selected = category === c;
            return (
              <button
                key={c}
                disabled={!enabled}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                  selected
                    ? "border-black bg-white/80 text-black shadow-sm"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                } ${!enabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 text-black" />}
                {tAll(`Enums.JobCategory.${c}`)}
                {selected && <Check className="w-3 h-3 text-black" />}
              </button>
            );
          })}
        </div>
      </div>
      <hr className="my-6 border-t border-gray-200" />
      {/* 🧑‍💻 Roles */}
      <div className="space-y-3">
        <Label className="text-base font-medium text-black">{tA("roles.title")}</Label>
        {category ? (
          <div className="flex flex-wrap gap-2">
            {roleSuggestions.map((r) => {
              const selected = roles.includes(r);
              const slug = r
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
              return (
                <button
                  key={r}
                  disabled={!enabled}
                  onClick={() =>
                    setRoles((prev) =>
                      selected ? prev.filter((x) => x !== r) : [...prev, r]
                    )
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                    selected
                      ? "border-black bg-white/80 text-black shadow-sm"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  } ${!enabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {selected && <Check className="w-3 h-3 text-black" />}
                  {(() => {
                    const has = messages?.AutoApply?.roles && slug in messages.AutoApply.roles;
                    return has ? tA(`roles.${slug}`) : r;
                  })()}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tA("roles.emptyHint")}</p>
        )}
      </div>

      <hr className="my-6 border-t border-gray-200" />

      {/* 🏷️ Tags (keywords) */}
      <div className="space-y-3">
        <Label className="text-base font-medium text-black">{tA("keywords.title")}</Label>
        {category ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((tag) => {
              const selected = keywords.includes(tag);
              const slug = tag
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
              return (
                <button
                  key={tag}
                  disabled={!enabled}
                  onClick={() =>
                    setKeywords((prev) =>
                      selected ? prev.filter((k) => k !== tag) : [...prev, tag]
                    )
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                    selected
                      ? "border-black bg-white/80 text-black shadow-sm"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  } ${!enabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {selected && <Check className="w-3 h-3 text-black" />}
                  {(() => {
                    const has = messages?.AutoApply?.keywords && slug in messages.AutoApply.keywords;
                    return has ? tA(`keywords.${slug}`) : tag;
                  })()}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tA("keywords.emptyHint")}</p>
        )}
      </div>

      <hr className="my-6 border-t border-gray-200" />

      {/* 📊 Auto-apply stats */}
      <div className="space-y-3">
        <Label className="text-base font-medium text-black">{tA("stats.title")}</Label>

        <div className="p-4 space-y-4 rounded-xl border shadow-sm backdrop-blur-sm bg-white/70">
          {/* Top summary row */}
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-muted-foreground">{tA("stats.autoApplied")}</div>
              <div className="text-2xl font-semibold text-black">
                {appliedCount}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <Progress value={pct} className="w-40 h-2" />
              <span className="mt-1 text-xs text-muted-foreground">
                {tA("stats.progress", { used: appliedCount, cap: displayCap })}
              </span>
            </div>
          </div>

          {/* Divider */}
          {stats?.recent && stats.recent.length > 0 && (
            <>
              <hr className="border-t border-gray-200" />
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">{tA("stats.recent")}</div>
                <ul className="space-y-2">
                  {stats.recent.slice(0, 5).map((app) => (
                    <li
                      key={app.id}
                      className="flex justify-between items-center p-2 rounded-lg border transition-colors hover:bg-gray-50"
                    >
                      <div className="text-sm">
                        <span className="font-medium text-black">
                          {app.job?.title || tA("stats.unknownJob")}
                        </span>
                        {app.job?.companyName && (
                          <span className="text-muted-foreground">
                            {" "}
                            — {app.job.companyName}
                          </span>
                        )}
                      </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(app.createdAt).toLocaleDateString(undefined, {
                            month: "short", 
                            day: "numeric",
                          })}
                        </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 💾 Save */}
      <Button
        onClick={save}
        disabled={mutation.isPending}
        className="bg-black hover:bg-black/80"
      >
        {tA("save")}
      </Button>
    </div>
  );
}
