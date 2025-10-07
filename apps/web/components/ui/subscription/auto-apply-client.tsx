"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/app/_trpc/client";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Check } from "lucide-react";

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

import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";
import { Progress } from "@workspace/ui/components/progress";

type JobCategory = (typeof jobCategoryValues)[number];

export default function AutoApplySettingsPage() {
  const { data, refetch } = trpc.auth.getAutoApplyPrefs.useQuery();
  const mutation = trpc.auth.updateAutoApplyPrefs.useMutation();

  // NEW: fetch auto-apply stats (count this month)
  const { data: stats, refetch: refetchStats } =
    trpc.auth.getAutoApplyStats.useQuery();

  const [enabled, setEnabled] = useState(false);
  const [category, setCategory] = useState<JobCategory | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // helpers
  const addTag = (t: string) => {
    if (!t) return;
    if (!keywords.includes(t)) setKeywords([...keywords, t]);
    setTagInput("");
  };
  const removeTag = (t: string) => setKeywords(keywords.filter((k) => k !== t));

  // effects
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
      await mutation.mutateAsync({
        enabled,
        category,
        keywords,
      });
      toast.success("Preferences saved");
      refetch();
      refetchStats();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
  };

  // Visual indicator scaling (UI-only). We don't have a stored limit — so this is purely a visual "activity" bar.
  // We pick a display cap (e.g. 20) so the bar fills reasonably; this does not impose any limit server-side.
  const displayCap = 20;
  const appliedCount = stats?.appliedCount ?? 0;
  const pct = Math.min((appliedCount / displayCap) * 100, 100);

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

      {/* —— Auto-apply stats (server-side count) —— */}
      <div className="mt-4">
        <Label>Auto-apply activity (this month)</Label>
        <div className="mt-2 p-4 rounded-xl border bg-white/70 backdrop-blur-sm shadow-sm space-y-4">
          {/* header */}
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

          {/* recent list */}
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
