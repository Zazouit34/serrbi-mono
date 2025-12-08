"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { useTranslations } from "next-intl";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import type { LLMResumeAnalysis } from "@/app/utils/pdf/score-calculator";

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

type PropsWithTheme = Props & { darkMode?: boolean; size?: "default" | "large" };

type ProgressCircleProps = {
  value: number;
  max: number;
  label: string;
};

function ProgressCircle({ value, max, label }: ProgressCircleProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const percentage = max > 0 ? (clamped / max) * 100 : 0;
  const radius = 79.5;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg
        width="183"
        height="176"
        viewBox="0 0 183 176"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full max-w-[183px]"
      >
        <defs>
          <linearGradient
            id="progressGradient"
            x1="91.5"
            y1="12"
            x2="91.5"
            y2="176"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FF97AD" />
            <stop offset="1" stopColor="#5171FF" />
          </linearGradient>
        </defs>

        {/* Background arc */}
        <path
          d="M171 94C171 83.2317 168.944 72.5687 164.948 62.62C160.953 52.6713 155.097 43.6317 147.715 36.0173C140.333 28.4029 131.569 22.3628 121.923 18.2419C112.278 14.121 101.94 12 91.5 12C81.0599 12 70.7221 14.121 61.0767 18.2419C51.4313 22.3628 42.6673 28.4028 35.285 36.0172C27.9028 43.6316 22.0468 52.6713 18.0516 62.6199C14.0563 72.5686 12 83.2316 12 94"
          stroke="#EAECF0"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Progress arc */}
        <path
          d="M12 94C12 80.4448 15.2579 67.1011 21.4823 55.1626C27.7067 43.2242 36.7033 33.0636 47.6672 25.5899C58.6311 18.1161 71.2203 13.5624 84.3084 12.3362C97.3964 11.11 110.575 13.2495 122.665 18.5634"
          stroke="url(#progressGradient)"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: progressOffset,
            transition: "stroke-dashoffset 0.9s ease-in-out",
          }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-[49px]">
        <div className="text-center text-2xl font-semibold leading-10 tracking-[-0.02em] text-[#1D2939]">
          {Math.round(clamped)}/{max}
        </div>
        <div className="mt-1 text-center text-base font-normal leading-[140%] text-[#475467]">
          {label}
        </div>
      </div>
    </div>
  );
}

export function ResumeScoreCard({
  score,
  breakdown,
  loading,
  darkMode,
  llm,
  size = "default",
}: PropsWithTheme) {
  const t = useTranslations("ResumeScore");
  const tAll = useTranslations();
  const tr = (key: string, fallback: string) => (tAll as any).has?.(key) ? (tAll as any)(key) : fallback;
  const [displayValue, setDisplayValue] = useState(0);
  const target = Math.max(0, Math.min(100, Math.round(score || 0)));
  const animRef = useRef<number | null>(null);
  const isLarge = size === "large";

  // Smooth animation
  useEffect(() => {
    if (loading && !score) {
      let dir = 1;
      let val = 20;
      const tick = () => {
        val += dir * 2;
        if (val >= 60) dir = -1;
        if (val <= 10) dir = 1;
        setDisplayValue(val);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }
  }, [loading, score]);

  // Animate to actual score
  useEffect(() => {
    if (score || score === 0) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const start = performance.now();
      const from = displayValue;
      const duration = 900;
      const step = (t: number) => {
        const e = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - e, 3);
        setDisplayValue(Math.round(from + (target - from) * eased));
        if (e < 1) animRef.current = requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }
  }, [score]);

  const hasLLM = !!llm;
  const atsScore = llm?.overallScore ?? target;

  const combinedChecklist: string[] = [
    ...(breakdown.flatMap((b) => b.missing ?? []) ?? []),
    ...(llm?.improvements ?? []),
  ].slice(0, 12);

  const formatSalary = (value: number) =>
    `€${Math.round(value).toLocaleString()}`;

  const getStatusForScore = (value: number, max: number) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    if (pct >= 75) {
      return {
        key: "strong",
        label: tr("ResumeScore.status.strong", "Strong"),
        className: "bg-emerald-50 text-emerald-700",
      };
    }
    if (pct >= 45) {
      return {
        key: "goodStart",
        label: tr("ResumeScore.status.goodStart", "Good start"),
        className: "bg-amber-50 text-amber-700",
      };
    }
    return {
      key: "needsWork",
      label: tr("ResumeScore.status.needsWork", "Needs work"),
      className: "bg-rose-50 text-rose-700",
    };
  };

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl rounded-2xl bg-white p-5 md:p-6 space-y-6",
        darkMode && "bg-transparent shadow-none text-white",
      )}
    >
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {tr("ResumeScore.title", "Your Resume Score")}
        </h2>
        <p className="text-sm text-slate-600 dark:text-white/70">
          {tr(
            "ResumeScore.subtitle",
            "This score is calculated based on key resume signals like structure, skills, and ATS readiness.",
          )}
        </p>
      </div>

      {/* Top: circle + salary / quick ATS summary */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
        <div className="flex justify-center md:justify-start">
          <ProgressCircle
            value={displayValue}
            max={100}
            label={tr("ResumeScore.overallLabel", "Your resume score")}
          />
        </div>

        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {tr("ResumeScore.atsTitle", "ATS Score - {score}/100").replace("{score}", String(atsScore))}
          </p>
          <p className="text-sm text-slate-700">
            {tr(
              "ResumeScore.atsIntro",
              "We scan your resume like an employer's Applicant Tracking System. Here's how it performs today:",
            )}
          </p>

          <ul className="space-y-1.5 text-xs">
            <li className="flex items-start gap-2 text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span>
                {tr(
                  "ResumeScore.atsBullet.formatting",
                  "Clear formatting that is easily readable by most ATS.",
                )}
              </span>
            </li>
            <li className="flex items-start gap-2 text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span>
                {tr(
                  "ResumeScore.atsBullet.keywords",
                  "Good use of role‑relevant keywords across experience and skills.",
                )}
              </span>
            </li>
            <li className="flex items-start gap-2 text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
              <span>
                {tr(
                  "ResumeScore.atsBullet.skillsWarning",
                  "Some sections could be stronger (skills, metrics, or links). See the checklist below.",
                )}
              </span>
            </li>
          </ul>

          {llm?.salaryRange &&
            Number.isFinite(llm.salaryRange.min) &&
            Number.isFinite(llm.salaryRange.max) && (
              <div className="mt-3 rounded-xl bg-white px-3 py-2.5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  {tr("ResumeScore.salaryTitle", "Estimated monthly salary range")}
                </p>
                <p className="text-sm font-semibold text-emerald-700">
                  {formatSalary(llm.salaryRange.min)} –{" "}
                  {formatSalary(llm.salaryRange.max)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {tr(
                    "ResumeScore.salarySubtitle",
                    "Based on similar profiles, roles, and skills in your target market.",
                  )}
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Breakdown rows */}
      <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
        {breakdown.map((item) => {
          const status = getStatusForScore(item.score, item.max);
          return (
            <div
              key={item.category}
              className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs shadow-sm"
            >
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{item.category}</p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    status.className,
                  )}
                >
                  {status.label}
                </span>
              </div>
              <div className="text-right text-sm font-semibold text-slate-700">
                {item.score}/{item.max}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checklist / detailed insights */}
      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800 shadow-sm">
          <span>{tr("ResumeScore.checklistTitle", "Resume improvement checklist")}</span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
          <p className="mb-1 text-[11px] text-slate-500">
            {tr(
              "ResumeScore.checklistIntro",
              "Focus on the items below to move your score closer to 100.",
            )}
          </p>
          {(combinedChecklist.length
            ? combinedChecklist
            : [tr("ResumeScore.noInsights", "AI insights will appear here after analyzing your resume.")]
          ).map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="flex items-start gap-2 rounded-lg bg-white px-2 py-1.5"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
              <span>{item}</span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
