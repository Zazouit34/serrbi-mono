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

type KeyCategory = "experience" | "skills" | "impact" | "projects";

const KEY_COLORS: Record<KeyCategory, string> = {
  experience: "#DB5A42",
  skills: "#4C6FFF",
  impact: "#F59E0B",
  projects: "#8A5CF6",
};

const KEY_LABELS: Record<KeyCategory, string> = {
  experience: "Experience",
  skills: "Skills",
  impact: "Impact",
  projects: "Projects",
};

function normalizeCategory(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function mapToKeyCategory(name: string): KeyCategory | null {
  const normalized = normalizeCategory(name);
  if (normalized.includes("experience")) return "experience";
  if (normalized.includes("skill")) return "skills";
  if (normalized.includes("impact")) return "impact";
  if (normalized.includes("project")) return "projects";
  return null;
}

function ProgressCircle({ value, max, label }: ProgressCircleProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const percentage = max > 0 ? (clamped / max) * 100 : 0;
  const radius = 79.5;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="inline-flex relative flex-col justify-center items-center">
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

type KeyArcStackProps = {
  items: Array<{ item: BreakdownItem; key: KeyCategory }>;
};

function KeyArcStack({ items }: KeyArcStackProps) {
  const size = 260;
  const center = size / 2;
  const radii = [110, 94, 78, 62];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto w-full max-w-sm">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="w-full"
        >
          <g transform={`rotate(-110 ${center} ${center})`}>
            {items.map(({ item, key }, idx) => {
              const radius = radii[idx] ?? radii[radii.length - 1] ?? 70;
              const circumference = 2 * Math.PI * radius;
              const arcLength = circumference * 0.82;
              const gap = circumference - arcLength;
              const pct = item.max > 0 ? Math.min(1, Math.max(0, item.score / item.max)) : 0;
              const progressLength = arcLength * pct;
              const color = KEY_COLORS[key];

              return (
                <g key={`${item.category}-${key}`}>
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={14}
                    strokeLinecap="round"
                    strokeDasharray={`${arcLength} ${gap}`}
                    strokeDashoffset={gap / 2}
                    opacity={0.55}
                  />
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={14}
                    strokeLinecap="round"
                    strokeDasharray={`${progressLength} ${circumference}`}
                    strokeDashoffset={gap / 2}
                    style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.3s ease" }}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(({ item, key }) => (
          <div
            key={`${item.category}-${key}-legend`}
            className="flex justify-between items-center px-3 py-2 text-sm rounded-xl border border-slate-200"
          >
            <div className="flex gap-2 items-center">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: KEY_COLORS[key] }}
                aria-hidden
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900">{KEY_LABELS[key]}</span>
                <span className="text-xs text-slate-500">{item.category}</span>
              </div>
            </div>
            <div className="text-sm font-semibold text-right text-slate-700">
              {item.score}/{item.max}
            </div>
          </div>
        ))}
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

  const orderedKeys: KeyCategory[] = ["experience", "skills", "impact", "projects"];
  const keyItems = orderedKeys
    .map((key) => {
      const match = breakdown.find((b) => mapToKeyCategory(b.category) === key);
      return match ? { item: match, key } : null;
    })
    .filter(Boolean) as Array<{ item: BreakdownItem; key: KeyCategory }>;

  const remainingBreakdown = breakdown.filter(
    (b) => !mapToKeyCategory(b.category),
  );

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
        "mx-auto w-full max-w-4xl space-y-8 text-slate-900",
        darkMode && "text-white",
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold leading-tight">
          {tr("ResumeScore.title", "Your Resume Score")}
        </h2>
        <p className="text-sm text-slate-600 dark:text-white/70">
          {tr(
            "ResumeScore.subtitle",
            "A clear, human-friendly view of how your resume performs.",
          )}
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
        <div className="space-y-4">
          <div className="flex justify-center md:justify-start">
            <ProgressCircle
              value={displayValue}
              max={100}
              label={tr("ResumeScore.overallLabel", "Your resume score")}
            />
          </div>

          <div className="p-5 rounded-2xl border shadow-sm border-slate-200 bg-white/70">
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
              {tr("ResumeScore.atsTitle", "ATS Score - {score}/100").replace("{score}", String(atsScore))}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {tr(
                "ResumeScore.atsIntro",
                "We scan your resume like an employer's Applicant Tracking System. Here's how it performs today:",
              )}
            </p>

            <ul className="mt-3 space-y-2 text-xs">
              <li className="flex gap-2 items-start text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>
                  {tr(
                    "ResumeScore.atsBullet.formatting",
                    "Clear formatting that is easily readable by most ATS.",
                  )}
                </span>
              </li>
              <li className="flex gap-2 items-start text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>
                  {tr(
                    "ResumeScore.atsBullet.keywords",
                    "Good use of role‑relevant keywords across experience and skills.",
                  )}
                </span>
              </li>
              <li className="flex gap-2 items-start text-amber-700">
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
                <div className="mt-4 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                  <p className="text-xs font-semibold text-slate-500">
                    {tr("ResumeScore.salaryTitle", "Estimated monthly salary range")}
                  </p>
                  <p className="text-sm font-semibold text-emerald-700">
                    {formatSalary(llm.salaryRange.min)} – {formatSalary(llm.salaryRange.max)}
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

        <div className="space-y-4">
          {keyItems.length > 0 && (
            <div className="p-5 rounded-2xl border shadow-sm border-slate-200 bg-white/70">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                    {tr("ResumeScore.keySections", "Core sections")}
                  </p>
                  <p className="text-sm text-slate-600">
                    {tr(
                      "ResumeScore.keySectionsSubtitle",
                      "Experience, skills, impact, and projects as easy-to-read arcs.",
                    )}
                  </p>
                </div>
              </div>
              <KeyArcStack items={keyItems} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
          {tr("ResumeScore.detailTitle", "Detailed signals")}
        </h3>
        <div className="grid gap-2">
          {remainingBreakdown.length === 0 ? (
            <p className="text-sm text-slate-500">
              {tr("ResumeScore.noDetails", "We surface details once your resume is analyzed.")}
            </p>
          ) : (
            remainingBreakdown.map((item) => {
              const status = getStatusForScore(item.score, item.max);
              return (
                <div
                  key={item.category}
                  className="flex justify-between items-center px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white/60"
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
                  <div className="text-sm font-semibold text-right text-slate-700">
                    {item.score}/{item.max}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="flex justify-between items-center px-3 py-2 w-full text-sm font-semibold text-left bg-white rounded-xl border shadow-sm border-slate-200 text-slate-800">
          <span>{tr("ResumeScore.checklistTitle", "Resume improvement checklist")}</span>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </CollapsibleTrigger>
        <CollapsibleContent className="p-3 mt-2 space-y-1 text-xs rounded-xl border border-slate-100 bg-white/70 text-slate-700">
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
              className="flex items-start gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1.5"
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
