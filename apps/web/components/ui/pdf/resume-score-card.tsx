"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RadialBarChart, RadialBar, PolarRadiusAxis, PolarAngleAxis, Label } from "recharts";

type Props = {
  score: number; // 0-100
  suggestions: string[];
  loading?: boolean;
};

export function ResumeScoreCard({ score, suggestions, loading }: Props) {
  const [displayValue, setDisplayValue] = useState(0);
  const target = Math.max(0, Math.min(100, Math.round(score || 0)));
  const animRef = useRef<number | null>(null);

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
        animRef.current = null;
      };
    }
  }, [loading, score]);

  useEffect(() => {
    if (score || score === 0) {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      const start = performance.now();
      const from = displayValue;
      const duration = 700;
      const step = (t: number) => {
        const e = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - e, 3);
        setDisplayValue(Math.round(from + (target - from) * eased));
        if (e < 1) animRef.current = requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        animRef.current = null;
      };
    }
  }, [score]);

  const data = useMemo(() => [{ name: "score", value: Math.max(0, Math.min(100, displayValue)) }], [displayValue]);

  return (
    <div className="p-2 w-full">
      <div className="mx-auto max-w-[320px]">
        <RadialBarChart
          width={320}
          height={320}
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius={108}   // thinner arc (inner closer to outer)
          outerRadius={120}
        >
          {/* Bind arc to 0–100 */}
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
          {/* Single emerald arc, no background/track */}
          <RadialBar
            angleAxisId={0}
            dataKey="value"
            cornerRadius={10}
            fill="#10b981"
          />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={(props) => {
                const viewBox = props.viewBox as any;
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  const cx = viewBox.cx, cy = viewBox.cy;
                  return (
                    <g>
                      {/* Center circle inside the hole */}
                      <circle cx={cx} cy={cy} r={70} fill="white" />
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={cx} y={cy} className="text-3xl font-bold fill-emerald-600">
                          {displayValue}%
                        </tspan>
                        <tspan x={cx} y={cy + 22} className="fill-muted-foreground">
                          CV score
                        </tspan>
                      </text>
                    </g>
                  );
                }
                return null;
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </div>

      {loading && !score ? (
        <div className="mt-2 text-sm text-center text-foreground/80">Analyzing your resume…</div>
      ) : null}

      {suggestions?.length ? (
        <div className="mt-2 text-sm text-foreground/80">
          <span className="font-medium">To reach 100% add or improve:</span>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            {Array.from(new Set(suggestions)).slice(0, 8).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}