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

type JobCategory = (typeof jobCategoryValues)[number];

export default function AutoApplySettingsPage() {
  const { data, refetch } = trpc.auth.getAutoApplyPrefs.useQuery();
  const mutation = trpc.auth.updateAutoApplyPrefs.useMutation();

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
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
  };

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
                    {selected && (
                      <Check className="w-3 h-3 ml-1 text-black" />
                    )}
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

      {/* 💾 Save */}
      <Button onClick={save} disabled={mutation.isPending} className="bg-black hover:bg-black/80">
        Save preferences
      </Button>
    </div>
  );
}
