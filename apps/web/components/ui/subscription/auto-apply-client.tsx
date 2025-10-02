"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/app/_trpc/client";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
// adjust if your package re-export differs:
import { Tags, TagsTrigger, TagsValue, TagsContent, TagsInput, TagsList, TagsEmpty, TagsGroup, TagsItem } from "@workspace/ui/components/ui/shadcn-io/tags";
import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";
import { Button } from "@workspace/ui/components/button";
import { jobCategoryValues } from "@workspace/ui/lib/job-enum";
import { toast } from "sonner";

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
      <div className="flex gap-3 items-center">
        <Label htmlFor="auto-apply">Auto-apply</Label>
        <Switch
          id="auto-apply"
          checked={enabled}
          onCheckedChange={(v: boolean) => setEnabled(v)}
        />
      </div>

      <div className="space-y-2">
        <Label>Job Category</Label>
        <Select
          value={category ?? ""}
          onValueChange={(v) => setCategory(v as JobCategory)}
          disabled={!enabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {jobCategoryValues.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
      <Button onClick={save} disabled={mutation.isPending}>
        Save preferences
      </Button>
    </div>
  );
}
