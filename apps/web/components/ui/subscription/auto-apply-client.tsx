"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type JobCategory = (typeof jobCategoryValues)[number];

export default function AutoApplySettingsPage() {
  const router = useRouter();

  // ✅ Always call hooks — no conditions here
  const {
    data: subscription,
    isLoading: subLoading,
  } = trpc.auth.getUserSubscriptionStatus.useQuery();

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
    }
  }, [data]);

  const suggestions = useMemo<string[]>(() => {
    return category ? ((keywordsByCategory as any)[category] ?? []) : [];
  }, [category]);

  const save = async () => {
    try {
      await mutation.mutateAsync({ enabled, category, keywords });
      toast.success("Preferences saved");
      refetch();
      refetchStats();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
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
        <h2 className="text-2xl font-semibold text-black">
          Auto-Apply is for paid members only
        </h2>
        <p className="text-muted-foreground max-w-md">
          Upgrade to a <span className="font-medium text-black">Basic</span> or{" "}
          <span className="font-medium text-black">Premium</span> plan to unlock
          automatic job applications and save time.
        </p>
        <Button
          onClick={() => router.push("/subscription")}
          className="bg-black text-white hover:bg-black/80 transition"
        >
          View Plans
        </Button>
      </div>
    );
  }

  // ✅ Eligible user — show normal UI
  return (
    <div className="space-y-6 max-w-2xl">
      {/* 🔘 Enable Auto-apply */}
      <div className="flex gap-3 items-center">
        <Label htmlFor="auto-apply">Auto-apply</Label>
        <Switch
          id="auto-apply"
          checked={enabled}
          onCheckedChange={(v: boolean) => setEnabled(v)}
        />
      </div>

      {/* 🧩 Category Popover */}
      <div className="space-y-2">
        <Label>Job Category</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-1/3 justify-start"
              disabled={!enabled}
            >
              {category ? (
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon =
                      jobCategoryIcons[
                        category as keyof typeof jobCategoryIcons
                      ];
                    return Icon ? (
                      <Icon className="w-4 h-4 text-black" />
                    ) : null;
                  })()}
                  <span className="text-sm font-medium text-black">
                    {formatJobCategory(category)}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">Select Category</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="flex flex-wrap gap-2">
              {jobCategoryValues.map((c) => {
                const Icon =
                  jobCategoryIcons[c as keyof typeof jobCategoryIcons];
                const selected = category === c;
                return (
                  <Button
                    key={c}
                    variant="outline"
                    size="sm"
                    className={`rounded-full text-xs font-medium h-8 px-3 ${
                      selected
                        ? "bg-white/80 border-black text-black"
                        : "hover:bg-gray-50 border-gray-200 text-gray-700"
                    }`}
                    onClick={() => setCategory(c)}
                  >
                    {Icon && <Icon className="w-3 h-3 mr-1 text-black" />}
                    {formatJobCategory(c)}
                    {selected && <Check className="w-3 h-3 ml-1 text-black" />}
                  </Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 🏷️ Tags */}
      <div className="space-y-2">
        <Label>Tags (keywords)</Label>
        <Tags value={tagInput} setValue={setTagInput} className="w-full">
          <TagsTrigger>
            {keywords.map((k) => (
              <TagsValue key={k} onRemove={() => removeTag(k)}>
                {k}
              </TagsValue>
            ))}
          </TagsTrigger>
          <TagsContent>
            <TagsInput placeholder="Search tags..." />
            <TagsList>
              <TagsEmpty>No tags found.</TagsEmpty>
              <TagsGroup heading="Suggestions">
                {suggestions
                  .filter((s) => !keywords.includes(s))
                  .map((s) => (
                    <TagsItem key={s} onSelect={() => addTag(s)}>
                      {s}
                    </TagsItem>
                  ))}
              </TagsGroup>
            </TagsList>
          </TagsContent>
        </Tags>
      </div>

      {/* 📊 Auto-apply stats */}
      <div className="mt-4">
        <Label>Auto-apply activity (this month)</Label>
        <div className="mt-2 p-4 rounded-xl border bg-white/70 backdrop-blur-sm shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Auto-applied</div>
              <div className="text-lg font-semibold">{appliedCount}</div>
            </div>
            <div className="w-48">
              <Progress value={pct} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {appliedCount} applications this month
              </div>
            </div>
          </div>

          {stats?.recent && stats.recent.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Recent auto-applies
              </div>
              <ul className="space-y-2">
                {stats.recent.map((app) => (
                  <li
                    key={app.id}
                    className="flex justify-between items-center border rounded-lg p-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-sm">
                      <span className="font-medium text-black">
                        {app.job?.title || "Unknown Job"}
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
          )}
        </div>
      </div>

      {/* 💾 Save */}
      <Button
        onClick={save}
        disabled={mutation.isPending}
        className="bg-black hover:bg-black/80"
      >
        Save preferences
      </Button>
    </div>
  );
}
