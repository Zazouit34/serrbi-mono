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
};

export function ResumeScoreCard({ score, breakdown, loading }: Props) {
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

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center bg-white rounded-2xl shadow-sm p-6 w-full max-w-2xl mx-auto">
      {/* Left radial score */}
      <div className="w-[220px] h-[220px] flex-shrink-0">
        <RadialBarChart
          width={220}
          height={220}
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius={80}
          outerRadius={100}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
          <RadialBar
            angleAxisId={0}
            dataKey="value"
            cornerRadius={8}
            fill="#10b981"
            isAnimationActive={false}
          />
          <PolarRadiusAxis tick={false} axisLine={false}>
            <Label
              content={(props) => {
                const v = props.viewBox as any;
                if (!v || !("cx" in v)) return null;
                return (
                  <g>
                    <circle cx={v.cx} cy={v.cy} r={60} fill="white" />
                    <text x={v.cx} y={v.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={v.cx} y={v.cy} className="text-3xl font-bold fill-emerald-600">
                        {displayValue}%
                      </tspan>
                      <tspan
                        x={v.cx}
                        y={v.cy + 22}
                        className="fill-gray-500 text-sm font-medium"
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

      {/* Right progress bars */}
      <div className="flex flex-col justify-center flex-1 w-full mt-6 sm:mt-0 sm:ml-8 space-y-4">
        {grouped.map((item, idx) => (
          <div key={idx} className="w-full">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{item.name}</span>
              <span className="text-gray-500">{t("issuesCount", { count: 100 - item.value })}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
  );
}
