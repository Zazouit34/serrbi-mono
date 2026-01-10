"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { LLMResumeAnalysis } from "@/app/utils/pdf/score-calculator";
import ResumeScoreCardSimple, {
  RowItem,
  ScoreCardData,
} from "@/components/ui/resume-score-card-simple";

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
  const size = 320;
  const center = size / 2;
  const radii = [150, 132, 114, 96];
  const [animatedPercents, setAnimatedPercents] = useState<number[]>(
    () => metrics.map(() => 0),
  );

  useEffect(() => {
    let raf: number | null = null;
    let kickoff: number | null = null;
    const duration = 1200;
    const startValues = metrics.map(() => 0);

    const step = (startTime: number) => {
      raf = requestAnimationFrame((now) => {
        const elapsed = now - startTime;
        const e = Math.min(1, elapsed / duration);
        setAnimatedPercents(
          metrics.map((m, idx) => {
            const from = startValues[idx] ?? 0;
            const to = m.percent ?? 0;
            return Math.round(from + (to - from) * e);
          }),
        );
        if (e < 1) step(startTime);
      });
    };

    kickoff = requestAnimationFrame((t) => step(t));

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (kickoff) cancelAnimationFrame(kickoff);
    };
  }, [metrics]);

  const semiPath = (r: number) =>
    `M ${center} ${center - r} A ${r} ${r} 0 0 1 ${center} ${center + r}`;
  const semiLength = (r: number) => Math.PI * r;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
      <div className="flex flex-col gap-3 w-full lg:w-2/5">
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

      <div className="relative w-full lg:w-3/5">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="w-full">
          {metrics.map((metric, idx) => {
            const radius = radii[idx] ?? radii[radii.length - 1] ?? 70;
            const length = semiLength(radius);
            const pct = Math.max(
              0,
              Math.min(1, ((animatedPercents[idx] ?? metric.percent ?? 0)) / 100),
            );
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
                  style={{ transition: "stroke-dasharray 1.1s ease, stroke 0.4s ease" }}
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
  const tAll = useTranslations();
  const tr = (key: string, fallback: string) =>
    (tAll as any).has?.(key) ? (tAll as any)(key) : fallback;
  const target = Math.max(0, Math.min(100, Math.round(score || 0)));

  const rows: RowItem[] = breakdown.map((b) => {
    const pct = b.max > 0 ? Math.round((b.score / b.max) * 100) : 0;
    return {
      label: b.category,
      status: pct >= 75 ? "success" : "error",
      badge: `${pct}%`,
      details: b.missing ?? [],
    };
  });

  const issues =
    rows.filter((r) => r.status === "error").length +
    (llm?.improvements?.length ?? 0);

  const data: ScoreCardData = {
    score: target,
    issues,
    contentRows: rows.slice(0, 4),
    groupedSections: [
      {
        title: "SECTIONS",
        score: `${Math.round(target)}%`,
        rows: rows.slice(4, 7),
      },
      {
        title: "ATS ESSENTIALS",
        score: `${Math.round(target - 10)}%`,
        scoreTone: "red",
        rows: rows.slice(7, 10),
      },
      {
        title: "TAILORING",
        score: `${Math.round(target - 5)}%`,
        rows: rows.slice(10),
      },
    ],
  };

  return <ResumeScoreCardSimple data={data} />;
}
