"use client";

import { useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { cn } from "@workspace/ui/lib/utils";

type Status = "success" | "error";

type RowItem = {
  label: string;
  status: Status;
  badge: string;
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

const dummyMainScore = 69;
const dummyIssues = 5;

const contentRows: RowItem[] = [
  { label: "ATS Parse Rate", status: "success", badge: "No issues" },
  { label: "Quantifying Impact", status: "error", badge: "3 issues" },
  { label: "Repetition", status: "success", badge: "No issues" },
  { label: "Spelling & Grammar", status: "error", badge: "1 issue" },
];

const groupedSections: SectionGroup[] = [
  { title: "SECTIONS", score: "81%" },
  {
    title: "ATS ESSENTIALS",
    score: "50%",
    scoreTone: "red",
  },
  { title: "TAILORING", score: "72%" },
];

const essentialsRows: RowItem[] = [
  { label: "Experience", status: "success", badge: "OK" },
  { label: "Education", status: "success", badge: "OK" },
  { label: "Contact Information", status: "success", badge: "OK" },
];

const atsRows: RowItem[] = [
  { label: "File Format", status: "success", badge: "OK" },
  { label: "Design", status: "success", badge: "OK" },
  { label: "Email Address", status: "success", badge: "OK" },
  { label: "Hyperlink in Header", status: "error", badge: "Review" },
];

const tailoringRows: RowItem[] = [
  { label: "Hard Skills", status: "success", badge: "OK" },
  { label: "Soft Skills", status: "success", badge: "OK" },
  { label: "Action Verbs", status: "error", badge: "Improve" },
  { label: "Tailored Title", status: "success", badge: "OK" },
];

const circleColor = "#f59e0b";

function HalfArc({ value }: { value: number }) {
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
        <div className="text-[30px] font-bold text-[#f59e0b] leading-none">{dummyMainScore}/100</div>
        <p className="text-xs text-[#6b7280]">{dummyIssues} Issues</p>
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

export function ResumeScoreCardSimple() {
  const issues = dummyIssues;

  const collapsibleContent = useMemo(
    () => ({
      sections: essentialsRows,
      ats: atsRows,
      tailoring: tailoringRows,
    }),
    [],
  );

  return (
    <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-sm border border-[#e6ebf1] px-6 py-7">
      <div className="text-center">
        <h2 className="text-[22px] font-semibold text-[#1f2937]">Your Score</h2>
      </div>

      <div className="mt-4">
        <HalfArc value={dummyMainScore} />
      </div>

      <div className="my-6 h-px bg-[#e5e7eb]" />

      <div className="space-y-4">
        <SectionHeader title="CONTENT" score={`${dummyMainScore}%`} />
        {contentRows.map((row) => (
          <Row key={row.label} {...row} />
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <CollapsedSection title="SECTIONS" score="81%">
          {collapsibleContent.sections.map((row) => (
            <Row key={row.label} {...row} />
          ))}
        </CollapsedSection>
        <CollapsedSection
          title="ATS ESSENTIALS"
          score="50%"
          scoreColor={`${sectionColors.red}`}
        >
          {collapsibleContent.ats.map((row) => (
            <Row key={row.label} {...row} />
          ))}
        </CollapsedSection>
        <CollapsedSection title="TAILORING" score="72%">
          {collapsibleContent.tailoring.map((row) => (
            <Row key={row.label} {...row} />
          ))}
        </CollapsedSection>
      </div>
    </div>
  );
}

export default ResumeScoreCardSimple;

