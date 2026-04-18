"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { LLMResumeAnalysis } from "@/app/utils/pdf/score-calculator";
import { ChevronDown } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

type BreakdownItem = {
  category: string;
  score: number;
  max: number;
  missing?: string[];
};

type Props = {
  score: number;
  breakdown: BreakdownItem[];
  loading?: boolean;
  llm?: LLMResumeAnalysis | null;
};

type Status = "success" | "error";

type RowItem = {
  label: string;
  status: Status;
  badge: string;
  details?: string[];
  scorePct?: number;
  issueCount?: number;
};

type SectionGroup = {
  title: string;
  score: string;
  scoreTone?: "green" | "amber" | "red";
  rows?: RowItem[];
};

const sectionColors = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
} as const;

function HalfArc({ value, issuesLabel }: { value: number; issuesLabel: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = 60;
  const circumference = Math.PI * radius;
  const progress = (pct / 100) * circumference;
  const strokeColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-full max-w-[200px] mx-auto">
      <svg viewBox="0 0 180 100" className="w-full">
        <path
          d="M30 90 A60 60 0 0 1 150 90"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M30 90 A60 60 0 0 1 150 90"
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 pointer-events-none">
        <div className="text-3xl font-bold text-slate-900 leading-none">{pct}</div>
        <p className="text-[11px] text-slate-500 mt-0.5">{issuesLabel}</p>
      </div>
    </div>
  );
}

function SectionRow({
  title,
  score,
  scoreTone,
  rows,
}: SectionGroup) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "text-[11px] px-2 py-0.5 rounded-full border",
              scoreTone ? sectionColors[scoreTone] : sectionColors.amber
            )}
          >
            {score}
          </Badge>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-slate-500 transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>
      {open && (
        <div className="space-y-1.5 pl-1">
          {(rows ?? []).map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-[12px] text-slate-600 py-1"
            >
              <span>{row.label}</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0 border",
                  row.status === "success"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                )}
              >
                {row.badge}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResumeScoreCard({ score, breakdown }: Props) {
  const tAll = useTranslations();
  const tr = (key: string, fallback: string) =>
    (tAll as any).has?.(key) ? (tAll as any)(key) : fallback;

  const formatIssueCount = (count: number) => {
    const key = count === 1 ? "ResumeInsight.issueCount.one" : "ResumeInsight.issueCount.other";
    if ((tAll as any).has?.(key)) return (tAll as any)(key, { count });
    return `${count} issue${count === 1 ? "" : "s"}`;
  };

  const rows: RowItem[] = useMemo(
    () =>
      breakdown.map((b) => {
        const pct = b.max > 0 ? Math.round((b.score / b.max) * 100) : 0;
        const hasMissing = (b.missing?.length ?? 0) > 0;
        const status: Status = pct >= 75 && !hasMissing ? "success" : "error";
        const issueCount = status === "error" ? 1 : 0;
        const badge = issueCount > 0 ? formatIssueCount(issueCount) : `${pct}%`;
        return {
          label: b.category,
          status,
          badge,
          details: b.missing ?? [],
          scorePct: pct,
          issueCount,
        };
      }),
    [breakdown]
  );

  const issues = rows.reduce((sum, r) => sum + (r.issueCount ?? 0), 0);
  const issuesLabel = formatIssueCount(issues);

  const groupedSections = useMemo<SectionGroup[]>(() => {
    const slices = {
      content: rows.slice(0, 4),
      sections: rows.slice(4, 7),
      ats: rows.slice(7, 10),
      tailoring: rows.slice(10),
    };
    const tone = (val: number): SectionGroup["scoreTone"] =>
      val >= 80 ? "green" : val >= 65 ? "amber" : "red";
    const avg = (list: RowItem[]) =>
      list.length
        ? Math.round(list.reduce((s, r) => s + (r.scorePct ?? 0), 0) / list.length)
        : Math.round(score);
    return [
      {
        title: tr("ResumeInsight.content", "CONTENT"),
        score: `${avg(slices.content)}%`,
        scoreTone: tone(avg(slices.content)),
        rows: slices.content,
      },
      {
        title: tr("ResumeInsight.sections", "SECTIONS"),
        score: `${avg(slices.sections)}%`,
        scoreTone: tone(avg(slices.sections)),
        rows: slices.sections,
      },
      {
        title: tr("ResumeInsight.atsEssentials", "ATS ESSENTIALS"),
        score: `${Math.max(0, Math.round(score - 10))}%`,
        scoreTone: "red" as const,
        rows: slices.ats,
      },
      {
        title: tr("ResumeInsight.tailoring", "TAILORING"),
        score: `${Math.max(0, Math.round(score - 5))}%`,
        scoreTone: tone(Math.max(0, Math.round(score - 5))),
        rows: slices.tailoring,
      },
    ].filter((g) => (g.rows?.length ?? 0) > 0);
  }, [rows, score]);

  return (
    <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          {tr("ResumeInsight.yourScore", "Your Score")}
        </h2>
      </div>

      <div className="mt-3">
        <HalfArc value={score} issuesLabel={issuesLabel} />
      </div>

      <div className="my-4 h-px bg-slate-100" />

      <div className="space-y-3">
        {groupedSections.map((group, idx) => (
          <SectionRow key={`${group.title}-${idx}`} {...group} />
        ))}
      </div>
    </div>
  );
}
