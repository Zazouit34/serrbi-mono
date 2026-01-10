"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LLMResumeAnalysis } from "@/app/utils/pdf/score-calculator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { cn } from "@workspace/ui/lib/utils";

type BreakdownItem = {
  category: string;
  score: number;
  max: number;
  missing?: string[];
};

type Props = {
  score: number; // 0–100
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
};

type SectionGroup = {
  title: string;
  score: string;
  scoreTone?: "amber" | "red";
  rows?: RowItem[];
};

const sectionColors = {
  amber: "bg-[#fff7ed] text-[#f59e0b]",
  red: "bg-[#fee2e2] text-[#ef4444]",
} as const;

const circleColor = "#f59e0b";

function HalfArc({ value, issues }: { value: number; issues: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = 70;
  const circumference = Math.PI * radius;
  const progress = (pct / 100) * circumference;
  return (
    <div className="relative w-full max-w-[260px] mx-auto">
      <svg viewBox="0 0 200 120" className="w-full">
        <path
          d="M30 100 A70 70 0 0 1 170 100"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
        />
        <path
          d="M30 100 A70 70 0 0 1 170 100"
          fill="none"
          stroke={circleColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.9s ease" }}
        />
      </svg>
      <div className="flex absolute inset-0 flex-col justify-end items-center pb-1 pointer-events-none">
        <div className="text-[30px] font-bold text-[#f59e0b] leading-none">{pct}/100</div>
        <p className="text-xs text-[#6b7280]">{issues} Issues</p>
      </div>
    </div>
  );
}

function Row({ label, status, badge }: RowItem) {
  return (
    <div className="flex justify-between items-center py-2">
      <div className="flex gap-3 items-center">
        {status === "success" ? <Check /> : <Cross />}
        <span className="text-[20px] font-medium text-[#1f2937]">{label}</span>
      </div>
      <span
        className={cn(
          "text-sm px-3 py-1 rounded-full font-medium",
          status === "success" ? "bg-[#ecfdf5] text-[#0f9f74]" : "bg-[#f3f4f6] text-[#374151]",
        )}
      >
        {badge}
      </span>
    </div>
  );
}

function SectionHeader({ title, score }: { title: string; score: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[18px] font-medium tracking-wide text-[#4b5563]">{title}</span>
      <div className="flex gap-2 items-center">
        <span className="text-[14px] font-semibold text-[#f59e0b] bg-[#fff7ed] px-3 py-1 rounded-full">{score}</span>
        <Chevron size={18} />
      </div>
    </div>
  );
}

function CollapsedSection({
  title,
  score,
  scoreColor = "bg-[#fff7ed] text-[#f59e0b]",
  children,
}: {
  title: string;
  score: string;
  scoreColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex justify-between items-center py-2 w-full">
        <span className="text-[18px] font-medium tracking-wide text-[#4b5563]">{title}</span>
        <div className="flex gap-2 items-center">
          <span className={cn("px-3 py-1 font-semibold rounded-full text-[14px]", scoreColor)}>{score}</span>
          <Chevron size={18} />
        </div>
      </CollapsibleTrigger>
      {children && (
        <CollapsibleContent className="mt-2 space-y-3">
          {children}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6l-12 12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Chevron({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="#6b7280" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ResumeScoreCard({
  score,
  breakdown,
  llm,
}: Props) {
  const tAll = useTranslations();
  const tr = (key: string, fallback: string) =>
    (tAll as any).has?.(key) ? (tAll as any)(key) : fallback;

  const issuesFromMissing = breakdown.reduce((sum, b) => sum + (b.missing?.length ?? 0), 0);
  const issuesFromLLM = llm?.improvements?.length ?? 0;
  const issues = issuesFromMissing + issuesFromLLM;

  const rows: RowItem[] = useMemo(
    () =>
      breakdown.map((b) => {
        const pct = b.max > 0 ? Math.round((b.score / b.max) * 100) : 0;
        const status: Status = pct >= 75 && !(b.missing?.length) ? "success" : "error";
        const badge = b.missing?.length
          ? `${b.missing.length} issue${b.missing.length > 1 ? "s" : ""}`
          : `${pct}%`;
        return {
          label: b.category,
          status,
          badge,
          details: b.missing ?? [],
        };
      }),
    [breakdown],
  );

  const groupedSections = useMemo<SectionGroup[]>(() => {
    const slices = {
      content: rows.slice(0, 4),
      sections: rows.slice(4, 7),
      ats: rows.slice(7, 10),
      tailoring: rows.slice(10),
    };
    return [
      { title: tr("ResumeInsight.content", "CONTENT"), score: `${Math.round(score)}%`, rows: slices.content },
      { title: tr("ResumeInsight.sections", "SECTIONS"), score: `${Math.round(score)}%`, rows: slices.sections },
      {
        title: tr("ResumeInsight.atsEssentials", "ATS ESSENTIALS"),
        score: `${Math.max(0, Math.round(score - 10))}%`,
        scoreTone: "red" as const,
        rows: slices.ats,
      },
      { title: tr("ResumeInsight.tailoring", "TAILORING"), score: `${Math.max(0, Math.round(score - 5))}%`, rows: slices.tailoring },
    ].filter((g) => (g.rows?.length ?? 0) > 0);
  }, [rows, score]);

  return (
    <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-sm border border-[#e6ebf1] px-6 py-7 lg:sticky lg:top-4">
      <div className="text-center">
        <h2 className="text-[22px] font-semibold text-[#1f2937]">
          {tr("ResumeInsight.yourScore", "Your Score")}
        </h2>
      </div>

      <div className="mt-4">
        <HalfArc value={score} issues={issues} />
      </div>

      <div className="my-6 h-px bg-[#e5e7eb]" />

      <div className="space-y-4">
        <SectionHeader title={tr("ResumeInsight.content", "CONTENT")} score={`${Math.round(score)}%`} />
        {rows.slice(0, 4).map((row) => (
          <Row key={row.label} {...row} />
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {groupedSections.slice(1).map((group, idx) => (
          <CollapsedSection
            key={`${group.title}-${idx}`}
            title={group.title}
            score={group.score}
            scoreColor={
              group.scoreTone ? sectionColors[group.scoreTone] : sectionColors.amber
            }
          >
            {(group.rows ?? []).map((row) => (
              <Row key={row.label} {...row} />
            ))}
          </CollapsedSection>
        ))}
      </div>
    </div>
  );
}
