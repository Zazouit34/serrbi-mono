"use client";

import { useMemo, useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
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
  wage?: string | number | null;
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
      if (res?.message) setStatus("applied");
      else setStatus("idle");
    } catch {
      setStatus("idle");
    }
  };

  const location =
    job.city && job.stateAbbreviation
      ? `${job.city}, ${job.stateAbbreviation}`
      : job.city || job.stateAbbreviation || "";

  const companyLocation = [job.companyName, location].filter(Boolean).join(" · ");

  const displayTags = (job.tags || []).slice(0, 3);
  const jobType = job.type ? job.type.toString().replace(/_/g, " ") : "";
  const wage = job.wage ? String(job.wage) : "";

  const firstLetter = job.companyName?.trim()?.[0] ?? job.title?.trim()?.[0] ?? "S";

  const confidenceColors = {
    "very-strong": "bg-emerald-50 text-emerald-700 border-emerald-200",
    strong: "bg-blue-50 text-blue-700 border-blue-200",
    potential: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <Card className="w-full bg-white rounded-2xl border shadow-none border-slate-200">
      <CardContent className="px-4 py-4 space-y-3 w-full">

        {/* ── Main info row ── */}
        <div className="flex gap-3 items-start">
          {/* Avatar */}
          <Avatar className="h-10 w-10 rounded-xl shrink-0 mt-0.5">
            <AvatarImage
              src={job.companyImage || undefined}
              alt={job.companyName || job.title}
            />
            <AvatarFallback className="text-xs rounded-xl border border-slate-200">
              {firstLetter.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info block */}
          <div className="flex-1 min-w-0">
            {/* Line 1: title + confidence badge (with match % inside) */}
            <div className="flex gap-2 justify-between items-start">
              <p className="flex-1 min-w-0 text-sm font-semibold text-slate-900 line-clamp-1">
                {job.title}
              </p>
              {confidence && (
                <Badge
                  className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md border font-semibold ${
                    confidenceColors[confidence.level]
                  }`}
                >
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  {typeof matchPercent === "number" && (
                    <span className="font-black mr-1">
                      {Math.max(0, Math.min(100, Math.round(matchPercent)))}%
                    </span>
                  )}
                  {confidence.label}
                </Badge>
              )}
            </div>

            {/* Line 2: company · location + timeAgo */}
            <div className="flex items-center justify-between gap-2 mt-0.5">
              {companyLocation ? (
                <p className="text-[12px] text-slate-500 line-clamp-1 flex-1 min-w-0">
                  {companyLocation}
                </p>
              ) : (
                <span />
              )}
              <span className="text-[11px] text-slate-400 shrink-0">{postedAgo || timeAgo}</span>
            </div>

            {/* Line 3: wage + jobType pills */}
            {(wage || jobType || displayTags.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {wage && (
                  <span className="border border-slate-200 bg-white text-slate-700 text-[11px] font-medium px-2.5 py-0.5 rounded-md">
                    {wage}
                  </span>
                )}
                {jobType && (
                  <span className="border border-slate-200 bg-white text-slate-700 text-[11px] font-medium px-2.5 py-0.5 rounded-md capitalize">
                    {jobType}
                  </span>
                )}
                {displayTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="bg-slate-50 text-[10px] text-slate-600 border-slate-200 px-2 py-0.5 rounded-md"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom row: Why this job? (left) + Apply button (right) ── */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <button
            className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800 transition-colors"
            onClick={() => setShowReasons((v) => !v)}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showReasons ? "rotate-180" : ""}`}
            />
            {tA("listing.whyThisJob")}
          </button>

          {status === "applied" ? (
            <Badge className="bg-slate-900 text-white border-slate-900 text-[11px] px-3 py-1 rounded-lg">
              {tA("card.applied")}
            </Badge>
          ) : (
            <Button
              size="sm"
              className="h-7 px-3 text-[12px] rounded-lg bg-slate-900 text-white hover:bg-slate-800 border border-slate-900"
              onClick={handleApply}
              disabled={status === "applying"}
            >
              {status === "applying" ? tA("card.applying") : tA("card.apply")}
            </Button>
          )}
        </div>

        {/* ── Expanded reasons ── */}
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
