"use client";

import { useMemo, useState } from "react";
import { Mail, Sparkles, ChevronDown } from "lucide-react";
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
  type?: string | null;
};

type Status = "idle" | "applying" | "applied";

type AutoApplyCardProps = {
  job: AutoApplyJob;
  alreadyApplied?: boolean;
  onApply: () => Promise<{ message: string }>;
  confidence?: { level: "very-strong" | "strong" | "potential"; label: string };
  reasons?: string[];
  matchPercent?: number | null;
  postedAgo?: string;
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

export function AutoApplyCard({
  job,
  alreadyApplied,
  onApply,
  confidence,
  reasons = [],
  matchPercent,
  postedAgo,
}: AutoApplyCardProps) {
  const [status, setStatus] = useState<Status>(alreadyApplied ? "applied" : "idle");
  const [showReasons, setShowReasons] = useState(false);
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
  const jobType = job.type ? job.type.toString().replace(/_/g, " ") : "";

  const firstLetter = job.companyName?.trim()?.[0] ?? job.title?.trim()?.[0] ?? "S";

  return (
    <Card className="w-full rounded-2xl border border-slate-100 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
      <CardContent className="flex flex-col gap-3 px-4 py-4 w-full">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 rounded-xl">
              <AvatarImage src={job.companyImage || undefined} alt={job.companyName || job.title} />
              <AvatarFallback className="text-xs rounded-xl border border-slate-200">
                {firstLetter.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                  {job.title}
                </p>
                {job.companyName && (
                  <span className="text-[12px] text-slate-500">· {job.companyName}</span>
                )}
              </div>

              {location && (
                <p className="text-[12px] text-slate-500 line-clamp-1">{location}</p>
              )}
              {jobType && (
                <p className="text-[12px] text-slate-500 line-clamp-1 capitalize">{jobType}</p>
              )}

              {displayTags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {displayTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="bg-slate-50 text-[11px] text-slate-700 border-slate-200 px-2 py-0.5"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-2 md:items-end">
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Mail className="h-3 w-3" />
              {postedAgo || timeAgo}
            </div>

            {confidence && (
              <Badge
                className={`text-[11px] px-2.5 py-1 rounded-full ${
                  confidence.level === "very-strong"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : confidence.level === "strong"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {confidence.label}
              </Badge>
            )}
            {typeof matchPercent === "number" && (
              <p className="text-[11px] font-medium text-slate-600">
                Match: {Math.max(0, Math.min(100, Math.round(matchPercent)))}%
              </p>
            )}

            {status === "applied" ? (
              <AppliedBadge label={tA("card.applied")} />
            ) : (
              <Button
                size="sm"
                className="mt-1 h-8 px-3 text-[12px] rounded-full bg-slate-900 text-white hover:bg-slate-900/90 w-full md:w-auto"
                onClick={handleApply}
                disabled={status === "applying"}
              >
                {status === "applying" ? tA("card.applying") : tA("card.apply")}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            className="flex items-center gap-1 text-[12px] text-slate-600 hover:text-slate-900"
            onClick={() => setShowReasons((v) => !v)}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition ${showReasons ? "rotate-180" : ""}`} />
            {tA("listing.whyThisJob")}
          </button>
          <span className="text-[11px] text-slate-500">{timeAgo}</span>
        </div>

        {showReasons && reasons.length > 0 && (
          <div className="grid gap-1.5">
            {reasons.map((reason, idx) => (
              <div
                key={`${reason}-${idx}`}
                className="text-[12px] text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2"
              >
                {reason}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


