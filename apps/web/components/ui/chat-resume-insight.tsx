"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronDown, TrendingUp, Zap } from "lucide-react";

type Props = {
  score: number;
  skillGaps?: string[];
  improvements?: string[];
  suggestedRoles?: string[];
  onImproveResume?: () => void;
  reengagement?: boolean;
};

function scoreLabelKey(score: number): "excellent" | "good" | "average" | "needsWork" {
  if (score >= 80) return "excellent";
  if (score >= 65) return "good";
  if (score >= 50) return "average";
  return "needsWork";
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function scoreBarColor(score: number): string {
  if (score >= 75) return "from-emerald-500 to-emerald-400";
  if (score >= 50) return "from-amber-500 to-amber-400";
  return "from-red-500 to-red-400";
}

// Derive breakdown sub-scores from the overall score
function deriveBreakdown(score: number) {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  return {
    skillsMatch: clamp(score - 10),
    experience: clamp(score + 5),
    formatting: clamp(score + 10),
    atsCompatibility: clamp(score - 5),
  };
}

export function ChatResumeInsight({
  score,
  skillGaps = [],
  improvements = [],
  suggestedRoles = [],
  onImproveResume,
  reengagement = false,
}: Props) {
  const t = useTranslations("ChatResumeInsight");
  const [expanded, setExpanded] = useState(false);
  const [deepDive, setDeepDive] = useState(false);

  const topIssues = skillGaps.slice(0, 3);
  const breakdown = deriveBreakdown(score);
  const labelKey = scoreLabelKey(score);
  const scoreLabelText = t(`scoreLabels.${labelKey}`);

  // ── Re-engagement variant (STATE 7) ──────────────────────────────
  if (reengagement) {
    return (
      <div className="max-w-sm w-full rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 shrink-0">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-snug">
              {t("reengagementTitle")}
            </p>
            <p className="text-xs text-emerald-600 font-bold mt-0.5">
              {t("reengagementPotential")}
            </p>
          </div>
        </div>
        {onImproveResume && (
          <button
            onClick={onImproveResume}
            className="w-full text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95"
          >
            {t("improveNow")}
          </button>
        )}
      </div>
    );
  }

  // ── Collapsed — STATE 4 ──────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="max-w-sm w-full rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md bg-slate-100 flex items-center justify-center text-[10px]">
              {t("cvBadge")}
            </span>
            {t("resumeScore")}
          </span>
          <span className={cn("text-sm font-extrabold tabular-nums", scoreColor(score))}>
            {score}
            <span className="text-slate-400 font-normal text-xs ms-1">
              {t("scoreSeparator")} {scoreLabelText}
            </span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full bg-gradient-to-r transition-all duration-700", scoreBarColor(score))}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Top issues */}
        {topIssues.length > 0 && (
          <p className="text-[11px] text-slate-600 leading-relaxed">
            <span className="text-amber-500 me-1">⚠</span>
            {t("missingPrefix")} {topIssues.join(", ")}
          </p>
        )}

        {/* View insights CTA */}
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors group"
        >
          {t("viewInsights")}
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
        </button>
      </div>
    );
  }

  // ── Expanded — STATE 5 ───────────────────────────────────────────
  return (
    <div className="max-w-sm w-full rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-md bg-slate-100 flex items-center justify-center text-[10px]">
            {t("cvBadge")}
          </span>
          {t("resumeScore")}
        </span>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-extrabold tabular-nums", scoreColor(score))}>
            {score}
            <span className="text-slate-400 font-normal text-xs ms-1">{t("outOfHundred")}</span>
          </span>
          <button
            onClick={() => setExpanded(false)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full bg-gradient-to-r transition-all duration-700", scoreBarColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Key issues */}
      {topIssues.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
            {t("keyIssues")}
          </p>
          <ul className="space-y-1">
            {topIssues.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                <span className="text-amber-500 mt-px shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {improvements.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
            Suggestions
          </p>
          <ul className="space-y-1">
            {improvements.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                <span className="text-blue-400 mt-px shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested roles */}
      {suggestedRoles.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
            {t("suggestedRoles")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedRoles.slice(0, 4).map((role) => (
              <span
                key={role}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {onImproveResume && (
          <button
            onClick={onImproveResume}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95"
          >
            <Zap className="w-3 h-3" />
            {t("improveResume")}
          </button>
        )}
        <button
          onClick={() => setDeepDive((v) => !v)}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {deepDive ? t("hideDetails") : t("moreDetails")}
        </button>
      </div>

      {/* Deep dive — STATE 5 detail rows */}
      {deepDive && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {(
            [
              { id: "skillsMatch" as const, value: breakdown.skillsMatch },
              { id: "experience" as const, value: breakdown.experience },
              { id: "formatting" as const, value: breakdown.formatting },
              { id: "atsCompatibility" as const, value: breakdown.atsCompatibility },
            ] as const
          ).map(({ id, value }) => (
            <div key={id} className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 flex-1">{t(`breakdown.${id}`)}</span>
              <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full bg-gradient-to-r", scoreBarColor(value))}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className={cn("text-[11px] font-semibold tabular-nums w-8 text-right", scoreColor(value))}>
                {value}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
