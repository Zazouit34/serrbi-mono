"use client";

import { useMemo, useState } from "react";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";

type AutoApplyJob = {
  id: string;
  title: string;
  companyName: string | null;
  companyImage: string | null;
  description?: string | null;
  tags?: string[] | null;
  createdAt?: Date | string | null;
  city?: string | null;
  stateAbbreviation?: string | null;
};

type Status = "idle" | "applying" | "applied";

type AutoApplyCardProps = {
  job: AutoApplyJob;
  alreadyApplied?: boolean;
  onApply: () => Promise<{ message: string }>;
};

function formatTimeAgo(createdAt?: Date | string | null): string {
  if (!createdAt) return "";
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function AppliedBadge({ label }: { label: string }) {
  return (
    <Badge className="bg-black text-white border-black text-[11px] px-3 py-1 rounded-full">
      {label}
    </Badge>
  );
}

export function AutoApplyCard({ job, alreadyApplied, onApply }: AutoApplyCardProps) {
  const [status, setStatus] = useState<Status>(alreadyApplied ? "applied" : "idle");
  const tA = useTranslations("AutoApply");

  const timeAgo = useMemo(() => formatTimeAgo(job.createdAt), [job.createdAt]);

  const handleApply = async () => {
    if (status === "applied" || status === "applying") return;
    try {
      setStatus("applying");
      const res = await onApply();
      if (res?.message === "Already applied" || res?.message) {
        setStatus("applied");
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  };

  const location =
    job.city && job.stateAbbreviation
      ? `${job.city}, ${job.stateAbbreviation}`
      : job.city || job.stateAbbreviation || "";

  const displayTags = (job.tags || []).slice(0, 3);

  const firstLetter = job.companyName?.trim()?.[0] ?? job.title?.trim()?.[0] ?? "S";

  return (
    <Card className="rounded-2xl border border-slate-100 bg-slate-50/70 shadow-none">
      <CardContent className="flex justify-between items-start gap-3 px-3 py-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 rounded-lg">
            <AvatarImage src={job.companyImage || undefined} alt={job.companyName || job.title} />
            <AvatarFallback className="text-xs rounded-lg border border-slate-200">
              {firstLetter.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                {job.title}
              </p>
              {job.companyName && (
                <span className="text-[11px] text-slate-500">· {job.companyName}</span>
              )}
            </div>

            {location && (
              <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{location}</p>
            )}

            {displayTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {displayTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="bg-white/80 text-[11px] text-slate-600 border-slate-200 px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end justify-between h-full gap-2">
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Mail className="h-3 w-3" />
            {timeAgo}
          </span>

          {status === "applied" ? (
            <AppliedBadge label={tA("card.applied")} />
          ) : (
            <Button
              size="sm"
              className="mt-1 h-7 px-3 text-[11px] rounded-full bg-black text-white hover:bg-black/90"
              onClick={handleApply}
              disabled={status === "applying"}
            >
              {status === "applying" ? tA("card.applying") : tA("card.apply")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


