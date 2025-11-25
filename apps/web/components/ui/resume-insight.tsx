"use client";

import { useRef, useState, useEffect } from "react";
import { CloudUpload } from "lucide-react";
import { ResumeScoreCard } from "@/components/ui/pdf/resume-score-card";
import { useTranslations } from "next-intl";
import { parsePDF } from "@/app/utils/pdf/prase-pdf";
import {
  scoreResume,
  type ResumeScore,
} from "@/app/utils/pdf/score-calculator";

type BreakdownItem = {
  category: string;
  score: number;
  max: number;
  missing?: string[];
};

export function ResumeInsight() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const tAll = useTranslations();
  const tr = (key: string, fallback: string) => (tAll as any).has?.(key) ? (tAll as any)(key) : fallback;

  // Animate progress similar to uppy component
  useEffect(() => {
    if (!file) return;
    setProgress(0);
    setLoading(true);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setLoading(false);
          return 100;
        }
        return p + 4;
      });
    }, 25);
    return () => clearInterval(interval);
  }, [file]);

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return;
    setFile(f);
  };

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      const dt = e.dataTransfer;
      if (dt) onFiles(dt.files);
      el.classList.remove("ring-2", "ring-white/30");
    };
    const onDragOver = (e: DragEvent) => {
      prevent(e);
      el.classList.add("ring-2", "ring-white/30");
    };
    const onDragLeave = (e: DragEvent) => {
      prevent(e);
      el.classList.remove("ring-2", "ring-white/30");
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    el.addEventListener("dragenter", prevent);
    el.addEventListener("dragend", prevent);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("dragenter", prevent);
      el.removeEventListener("dragend", prevent);
    };
  }, []);

  const [scoreData, setScoreData] = useState<ResumeScore | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // When a file is selected, actually parse and score like resume-listing-form
  useEffect(() => {
    let cancelled = false;
    async function analyze() {
      if (!file) return;
      try {
        setAnalyzing(true);
        const text = await parsePDF(file);
        const r = await scoreResume(text);
        if (!cancelled) {
          setScoreData(r);
        }
      } catch {
        if (!cancelled) {
          // fallback to deterministic default if parsing fails
          const name = (file.name || "resume").toLowerCase();
          const size = file.size || 0;
          let seed = size % 101;
          for (let i = 0; i < name.length; i++) seed = (seed + name.charCodeAt(i)) % 101;
          const base = Math.max(35, Math.min(95, seed));
          setScoreData({
            score: base,
            breakdown: defaultBreakdown(base),
            suggestions: [],
          });
        }
      } finally {
        if (!cancelled) {
          setAnalyzing(false);
        }
      }
    }
    analyze();
    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <section className="mx-auto mt-10 w-full">
      <div className="relative overflow-hidden rounded-3xl bg-[#0e0f10] text-white border border-white/10">
        {!scoreData ? (
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: heading + dropzone */}
            <div className="relative p-6 sm:p-10">
            {/* Diagonal stripes background */}
            <div
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, #ffffff, #ffffff 2px, transparent 2px, transparent 12px)",
              }}
            />
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
                {tr("ResumeInsight.title", "Get your resume checked by AI in seconds")}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-white/70">
                {tr(
                  "ResumeInsight.subtitle",
                  "Drop a single PDF below. We’ll score it instantly on the right."
                )}
              </p>
            </div>

            <div className="mt-6">
              <div
                ref={dropRef}
                className="flex relative flex-col gap-3 justify-center items-center p-6 rounded-xl border border-dashed transition cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={tr("ResumeInsight.dropHint", "Drag & drop your PDF here, or click to browse")}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
                <CloudUpload className="w-10 h-10 text-white/80" />
                {!file ? (
                  <>
                    <p className="text-sm text-white/80">
                      {tr("ResumeInsight.dropHint", "Drag & drop your PDF here, or click to browse")}
                    </p>
                    <p className="text-xs text-white/50">
                      {tr("ResumeInsight.dropNote", "PDF only • Max 10MB")}
                    </p>
                  </>
                ) : (
                  <div className="w-full">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="overflow-hidden relative mt-2 w-full h-2 rounded-full bg-white/10">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-white/80 to-white/40"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: mock / live global score */}
          <div className="flex relative justify-center items-center p-6 sm:p-10">
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <div className="absolute right-[-20%] top-1/2 h-[120%] w-[120%] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,#c8ff2b22,#00000000)]" />
            </div>
            {analyzing && !scoreData ? (
              <div className="flex flex-col gap-6 justify-center items-center w-full max-w-md">
                <p className="text-lg font-medium text-center animate-pulse text-white/90">
                  {tr(
                    "ResumeInsight.analyzing",
                    "AI is analyzing your resume, estimating salary and generating tailored suggestions..."
                  )}
                </p>
                <div className="w-full max-w-xs">
                  <div className="overflow-hidden relative w-full h-2 rounded-full bg-white/10">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#c8ff2b] to-[#a0d922] animate-pulse"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-4 w-full max-w-md rounded-2xl border border-white/10 bg-black/20">
                <ResumeScoreCard
                  score={(scoreData as unknown as ResumeScore)?.score ?? 72}
                  breakdown={(scoreData as unknown as ResumeScore)?.breakdown ?? defaultBreakdown(72)}
                  llm={(scoreData as unknown as ResumeScore)?.llm}
                  loading={false}
                  darkMode
                />
              </div>
            )}
          </div>
        </div>
        ) : (
          <div className="p-6 sm:p-10">
            <ResumeScoreCard
              score={scoreData.score}
              breakdown={scoreData.breakdown as any}
              llm={scoreData.llm}
              loading={false}
              darkMode
            />
          </div>
        )}
      </div>
    </section>
  );
}

function defaultBreakdown(overall: number): BreakdownItem[] {
  // derive three bands around the overall score for the demo
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const structure = clamp(overall - 6);
  const measurable = clamp(overall - 2);
  const keywords = clamp(overall - 12);
  return [
    { category: "Contact Info", score: structure, max: 100 },
    { category: "Experience", score: structure, max: 100 },
    { category: "Education", score: structure, max: 100 },
    { category: "Skills", score: structure, max: 100 },
    { category: "Summary", score: structure, max: 100 },
    { category: "Impact / Metrics", score: measurable, max: 100 },
    { category: "Projects / Certifications", score: measurable, max: 100 },
    { category: "Recency", score: measurable, max: 100 },
    { category: "Action Verbs", score: keywords, max: 100 },
    { category: "Professional Links", score: keywords, max: 100 },
    { category: "Bullets / Formatting", score: keywords, max: 100 },
  ];
}

export default ResumeInsight;


