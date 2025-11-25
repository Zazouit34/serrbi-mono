"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  RadialBarChart,
  RadialBar,
  PolarRadiusAxis,
  PolarAngleAxis,
  Label,
} from "recharts";
import { cn } from "@workspace/ui/lib/utils";
import { useTranslations } from "next-intl";
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

type PropsWithTheme = Props & { darkMode?: boolean };
export function ResumeScoreCard({
  score,
  breakdown,
  loading,
  darkMode,
  llm,
}: PropsWithTheme) {
  const t = useTranslations("ResumeScore");
  const [displayValue, setDisplayValue] = useState(0);
  const target = Math.max(0, Math.min(100, Math.round(score || 0)));
  const animRef = useRef<number | null>(null);

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

  const data = useMemo(
    () => [{ name: "score", value: Math.max(0, Math.min(100, displayValue)) }],
    [displayValue]
  );

  // Group breakdown into 3 high-level bars
  const grouped = useMemo(() => {
    const structure = breakdown.filter((b) =>
      ["Contact Info", "Experience", "Education", "Skills", "Summary"].includes(b.category)
    );
    const measurable = breakdown.filter((b) =>
      ["Impact / Metrics", "Projects / Certifications", "Recency"].includes(b.category)
    );
    const keywords = breakdown.filter((b) =>
      ["Action Verbs", "Professional Links", "Bullets / Formatting"].includes(b.category)
    );

    const avg = (items: BreakdownItem[]) =>
      items.length
        ? Math.round(
            (items.reduce((a, b) => a + (b.score / b.max) * 100, 0) / items.length)
          )
        : 0;

    return [
      { name: t("structure"), value: avg(structure), color: "#991b1b" },
      { name: t("measurable"), value: avg(measurable), color: "#4f46e5" },
      { name: t("keywords"), value: avg(keywords), color: "#ca8a04" },
    ];
  }, [breakdown]);

  const hasLLM = !!llm;

  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-5 rounded-2xl p-5 w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto",
        darkMode ? "bg-transparent shadow-none" : "bg-white shadow-sm"
      )}
    >
      {/* Top: large radial score */}
      <div className="w-full flex justify-center">
        <RadialBarChart
          width={200}
          height={200}
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius={75}
          outerRadius={95}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
          <RadialBar
            angleAxisId={0}
            dataKey="value"
            cornerRadius={8}
            fill={darkMode ? "#a3e635" : "#10b981"}
            isAnimationActive={false}
          />
          <PolarRadiusAxis tick={false} axisLine={false}>
            <Label
              content={(props) => {
                const v = props.viewBox as any;
                if (!v || !("cx" in v)) return null;
                return (
                  <g>
                    {!darkMode && <circle cx={v.cx} cy={v.cy} r={60} fill="white" />}
                    <text x={v.cx} y={v.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={v.cx}
                        y={v.cy}
                        className={
                          darkMode
                            ? "text-3xl md:text-4xl font-bold fill-lime-300"
                            : "text-3xl md:text-4xl font-bold fill-emerald-600"
                        }
                      >
                        {displayValue}%
                      </tspan>
                      <tspan
                        x={v.cx}
                        y={v.cy + 22}
                        className={
                          darkMode
                            ? "text-xs md:text-sm font-medium fill-white/70"
                            : "text-xs md:text-sm font-medium fill-gray-500"
                        }
                      >
                        {t("overallScore")}
                      </tspan>
                    </text>
                  </g>
                );
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </div>

      {/* Middle: high-level progress bars (structure / measurable / keywords) */}
      <div className="flex flex-col justify-center space-y-4 w-full">
        <div className="space-y-3">
          {grouped.map((item, idx) => (
            <div key={idx} className="w-full">
              <div className="flex justify-between mb-1 text-xs sm:text-sm">
                <span
                  className={darkMode ? "font-medium text-white" : "font-medium text-gray-700"}
                >
                  {item.name}
                </span>
                <span className={darkMode ? "text-white/60" : "text-gray-500"}>
                  {t("issuesCount", { count: 100 - item.value })}
                </span>
              </div>
              <div
                className={
                  "h-2 rounded-full overflow-hidden " +
                  (darkMode ? "bg-white/10" : "bg-gray-200")
                }
              >
                <div
                  className={cn("h-2 rounded-full transition-all duration-700")}
                  style={{
                    width: `${item.value}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: LLM-driven insights, full-width under the score + bars */}
      <div
        className={cn(
          "px-3 py-3 rounded-xl border sm:px-4 sm:py-3",
          darkMode ? "border-white/10 bg-black/20" : "bg-gray-50 border-gray-100"
        )}
      >
        {hasLLM ? (
          <div className="space-y-3 text-xs sm:text-sm">
            {/* Suggested roles */}
            {llm?.suggestedRoles?.length ? (
              <div>
                <p
                  className={cn(
                    "mb-1.5 font-semibold",
                    darkMode ? "text-white" : "text-gray-900"
                  )}
                >
                  {t("suggestedRoles")}
                </p>
                <p
                  className={cn(
                    "flex flex-wrap gap-1.5",
                    darkMode ? "text-white/80" : "text-gray-700"
                  )}
                >
                  {llm.suggestedRoles.map((role, idx) => (
                    <span
                      key={`${role}-${idx}`}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                        darkMode
                          ? "border-white/15 bg-black/40 text-white/80"
                          : "border-gray-200 bg-white text-gray-700"
                      )}
                    >
                      {role}
                    </span>
                  ))}
                </p>
              </div>
            ) : null}

            {/* Skill gaps / missing keywords */}
            {llm?.skillGaps?.length ? (
              <div>
                <p
                  className={cn(
                    "mb-1.5 font-semibold",
                    darkMode ? "text-white" : "text-gray-900"
                  )}
                >
                  {t("skillGaps")}
                </p>
                <ul
                  className={cn(
                    "list-disc pl-4 space-y-0.5",
                    darkMode ? "text-white/80" : "text-gray-700"
                  )}
                >
                  {llm.skillGaps.map((gap, idx) => (
                    <li
                      key={`${gap}-${idx}`}
                      className="text-[11px] sm:text-xs leading-snug"
                    >
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Salary range */}
            {llm?.salaryRange &&
              Number.isFinite(llm.salaryRange.min) &&
              Number.isFinite(llm.salaryRange.max) && (
                <div className="flex justify-between items-center">
                  <p
                    className={cn(
                      "font-semibold",
                      darkMode ? "text-white" : "text-gray-900"
                    )}
                  >
                    {t("salaryRange")}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium sm:text-sm",
                      darkMode ? "text-lime-300" : "text-emerald-700"
                    )}
                  >
                    €{Math.round(llm.salaryRange.min).toLocaleString()} – €
                    {Math.round(llm.salaryRange.max).toLocaleString()}
                  </p>
                </div>
              )}

            {/* Improvements */}
            {llm?.improvements?.length ? (
              <div>
                <p
                  className={cn(
                    "mb-1.5 font-semibold",
                    darkMode ? "text-white" : "text-gray-900"
                  )}
                >
                  {t("improvements")}
                </p>
                <ul
                  className={cn(
                    "list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto pr-1",
                    darkMode ? "text-white/80" : "text-gray-700"
                  )}
                >
                  {llm.improvements.map((imp, idx) => (
                    <li
                      key={`${imp}-${idx}`}
                      className="text-[11px] sm:text-xs leading-snug"
                    >
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p
            className={cn(
              "text-[11px] sm:text-xs",
              darkMode ? "text-white/60" : "text-gray-500"
            )}
          >
            {t("noInsights")}
          </p>
        )}
      </div>
    </div>
  );
}
