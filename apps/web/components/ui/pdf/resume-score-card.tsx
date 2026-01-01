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
  size?: number;
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

type KeyMetric = {
  key: KeyCategory;
  label: string;
  categoryLabel: string;
  score: number;
  max: number;
  percent: number;
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

function deriveKeyMetrics(
  breakdown: BreakdownItem[],
  target: number,
): KeyMetric[] {
  const orderedKeys: KeyCategory[] = ["experience", "skills", "impact", "projects"];
  const clampPct = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const baseline = clampPct(target || 0);
  const globalAvg = clampPct(
    breakdown.length
      ? breakdown.reduce((sum, b) => {
          const pct = b.max > 0 ? (b.score / b.max) * 100 : 0;
          return sum + pct;
        }, 0) / breakdown.length
      : baseline,
  );

  const fallbackOffsets: Record<KeyCategory, number> = {
    experience: 4,
    skills: 0,
    impact: -4,
    projects: -8,
  };

  const softMatch = (b: BreakdownItem, key: KeyCategory) => {
    const n = normalizeCategory(b.category);
    if (key === "skills") return n.includes("keyword") || n.includes("tech") || n.includes("skill");
    if (key === "experience") return n.includes("work") || n.includes("role") || n.includes("experience");
    if (key === "impact") return n.includes("impact") || n.includes("metric") || n.includes("result");
    if (key === "projects") return n.includes("project") || n.includes("portfolio") || n.includes("case");
    return false;
  };

  return orderedKeys.map((key) => {
    const direct = breakdown.filter((b) => mapToKeyCategory(b.category) === key);
    const related = direct.length ? direct : breakdown.filter((b) => softMatch(b, key));
    const source = related.length ? related : null;

    const percent = source
      ? clampPct(
          source.reduce((sum, b) => sum + (b.max > 0 ? (b.score / b.max) * 100 : 0), 0) /
            source.length,
        )
      : clampPct(globalAvg + fallbackOffsets[key]);

    return {
      key,
      label: KEY_LABELS[key],
      categoryLabel: source?.[0]?.category ?? KEY_LABELS[key],
      score: clampPct(percent),
      max: 100,
      percent,
    };
  });
}

function ProgressCircle({ value, max, label, size = 260 }: ProgressCircleProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const percentage = max > 0 ? (clamped / max) * 100 : 0;
  const radius = 79.5;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="inline-flex relative flex-col justify-center items-center w-full" style={{ maxWidth: size }}>
      <svg
        width={size}
        height={(size * 176) / 183}
        viewBox="0 0 183 176"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
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
  metrics: KeyMetric[];
};

function KeyArcStack({ metrics }: KeyArcStackProps) {
  const size = 280;
  const center = size / 2;
  const radii = [120, 104, 88, 72];

  const semiPath = (r: number) =>
    `M ${center} ${center - r} A ${r} ${r} 0 0 1 ${center} ${center + r}`;
  const semiLength = (r: number) => Math.PI * r;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
      <div className="flex flex-col gap-3 w-full lg:w-1/2">
        {metrics.map((metric, idx) => (
          <div
            key={`${metric.key}-${metric.label}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-3 py-2.5"
          >
            <div className="flex gap-3 items-center">
              <span
                className="flex justify-center items-center w-8 h-8 text-xs font-semibold rounded-full border"
                style={{ borderColor: KEY_COLORS[metric.key], color: KEY_COLORS[metric.key] }}
              >
                {idx + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">{metric.label}</span>
                <span className="text-xs text-slate-500">{metric.categoryLabel}</span>
              </div>
            </div>
            <span className="text-base font-semibold text-slate-900">{metric.percent}%</span>
          </div>
        ))}
      </div>

      <div className="relative w-full lg:w-1/2">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="w-full">
          {metrics.map((metric, idx) => {
            const radius = radii[idx] ?? radii[radii.length - 1] ?? 70;
            const length = semiLength(radius);
            const pct = Math.max(0, Math.min(1, metric.percent / 100));
            const color = KEY_COLORS[metric.key];

            return (
              <g key={`${metric.key}-${radius}`}>
                <path
                  d={semiPath(radius)}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeDasharray={`${length} ${length}`}
                  pathLength={length}
                  opacity={0.45}
                />
                <path
                  d={semiPath(radius)}
                  fill="none"
                  stroke={color}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeDasharray={`${length * pct} ${length}`}
                  pathLength={length}
                  style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.3s ease" }}
                />
              </g>
            );
          })}
        </svg>
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

  const keyMetrics = deriveKeyMetrics(breakdown, target);

  const remainingBreakdown = breakdown.filter((b) => !mapToKeyCategory(b.category));

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
        "mx-auto w-full max-w-5xl space-y-10 text-slate-900",
        darkMode && "text-white",
      )}
    >
      <div className="p-6 space-y-6 rounded-3xl border shadow-sm border-slate-200 bg-white/80">
        <div className="flex flex-col gap-2">
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

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 justify-center">
            <ProgressCircle
              value={displayValue}
              max={100}
              size={320}
              label={tr("ResumeScore.overallLabel", "Your resume score")}
            />
          </div>

          <div className="space-y-4 w-full max-w-md">
            <div className="p-5 rounded-2xl border shadow-sm border-slate-200 bg-white/90">
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
        </div>
      </div>

      <div className="p-6 rounded-3xl border shadow-sm border-slate-200 bg-white/80">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
              {tr("ResumeScore.keySections", "Core sections")}
            </p>
            <p className="text-sm text-slate-600">
              {tr(
                "ResumeScore.keySectionsSubtitle",
                "Experience, skills, impact, and projects with clear percentages.",
              )}
            </p>
          </div>
          <span className="hidden text-xs text-slate-500 lg:block">
            {tr("ResumeScore.keySectionsHint", "Progress flows from top to bottom.")}
          </span>
        </div>
        <KeyArcStack metrics={keyMetrics} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="p-5 rounded-3xl border shadow-sm border-slate-200 bg-white/80">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            {tr("ResumeScore.detailTitle", "Detailed signals")}
          </h3>
          <div className="grid gap-2 mt-3">
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
                    className="flex justify-between items-center px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white/70"
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

        <div className="p-5 rounded-3xl border shadow-sm border-slate-200 bg-white/80">
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
      </div>
    </div>
  );
}
