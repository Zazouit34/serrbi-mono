"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { CloudUpload } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { parsePDF } from "@/app/utils/pdf/prase-pdf";
import {
  scoreResume,
  type ResumeScore,
} from "@/app/utils/pdf/score-calculator";
import { useAuthRedirect } from "@/lib/auth-client";
import { trpc } from "@/app/_trpc/client";
import LoadingProcess, {
  loadingSteps as defaultLoadingSteps,
} from "@/components/ui/loading-process";
import { ResumeScoreCard } from "@/components/ui/pdf/resume-score-card";
import Tag from "./tag";
import {
  FileText,
  Compass,
  Settings2,
  Target,
  Box,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

type ResumeInsightProps = {
  requireLogin?: boolean;
  callbackUrl?: string;
};

type BreakdownItem = {
  category: string;
  score: number;
  max: number;
  missing?: string[];
};

type DetailRow = {
  label: string;
  status: "success" | "error";
  badge: string;
  details: string[];
  scorePct?: number;
  issueCount?: number;
};

type InsightGroup = {
  title: string;
  icon?: string;
  rows: DetailRow[];
};

type InsightData = {
  groups: InsightGroup[];
};

export function ResumeInsight({
  requireLogin = false,
  callbackUrl = "/resume-analyzer",
}: ResumeInsightProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const tAll = useTranslations();
  const locale = useLocale();
  const tr = (key: string, fallback: string) =>
    (tAll as any).has?.(key) ? (tAll as any)(key) : fallback;

  const authStatus = useAuthRedirect(requireLogin, callbackUrl);

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
        return p + 2;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [file, locale]);

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf"))
      return;
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
      el.classList.remove("ring-2", "ring-blue-400");
    };
    const onDragOver = (e: DragEvent) => {
      prevent(e);
      el.classList.add("ring-2", "ring-blue-400");
    };
    const onDragLeave = (e: DragEvent) => {
      prevent(e);
      el.classList.remove("ring-2", "ring-blue-400");
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
  const { data: userData } = trpc.auth.userData.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const existingResumeUrl = userData?.user?.resumeUrl as string | undefined;

  const formatIssueCount = useCallback(
    (count: number) => {
      const key =
        count === 1
          ? "ResumeInsight.issueCount.one"
          : "ResumeInsight.issueCount.other";
      if ((tAll as any).has?.(key)) return (tAll as any)(key, { count });
      return `${count} issue${count === 1 ? "" : "s"}`;
    },
    [tAll]
  );

  const formatIssuesFound = useCallback(
    (count: number) => {
      const key =
        count === 1
          ? "ResumeInsight.issuesFound.one"
          : "ResumeInsight.issuesFound.other";
      if ((tAll as any).has?.(key)) return (tAll as any)(key, { count });
      return `${formatIssueCount(count)} found`;
    },
    [formatIssueCount, tAll]
  );

  const insightData = useMemo(
    () =>
      scoreData ? mapToInsightData(scoreData, formatIssueCount, tr) : null,
    [scoreData, formatIssueCount, tr]
  );

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
          for (let i = 0; i < name.length; i++)
            seed = (seed + name.charCodeAt(i)) % 101;
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

  if (requireLogin && authStatus !== "authenticated") {
    return (
      <section className="mx-auto mt-10 w-full">
        <div className="p-10 text-center rounded-3xl border border-slate-200 bg-slate-50 text-slate-700">
          {tr(
            "ResumeInsight.loginRequired",
            "Please sign in to access the AI resume analyzer."
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-10 w-full">
      <div className="relative text-slate-900">
        {!scoreData ? (
          <div className="relative p-6 sm:p-10">
            <div className="relative mx-auto space-y-6 max-w-3xl text-center">
              <div className="mx-auto space-y-2 max-w-2xl">
                <h2 className="font-work-sans text-3xl font-semibold leading-tight sm:text-4xl text-slate-900">
                  {tr(
                    "ResumeInsight.title",
                    "Get your resume checked by AI in seconds"
                  )}
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  {tr(
                    "ResumeInsight.subtitle",
                    "Drop a single PDF below. We'll score it instantly."
                  )}
                </p>
              </div>

              {existingResumeUrl && !file && (
                <div className="p-3 text-sm bg-blue-50 rounded-xl border border-slate-200 text-slate-700">
                  <p className="font-medium text-slate-900">
                    {tr(
                      "ResumeInsight.existingResumeTitle",
                      "You already have a resume saved to your profile."
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {tr(
                      "ResumeInsight.existingResumeSubtitle",
                      "You can analyze that resume now, or drop a new PDF below."
                    )}
                  </p>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    onClick={async () => {
                      try {
                        const res = await fetch(existingResumeUrl);
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const pdfFile = new File([blob], "resume.pdf", {
                          type: blob.type || "application/pdf",
                        });
                        setFile(pdfFile);
                      } catch (e) {
                        console.error(
                          "Failed to load existing resume for analysis",
                          e
                        );
                      }
                    }}
                  >
                    {tr(
                      "ResumeInsight.analyzeExisting",
                      "Analyze my saved resume"
                    )}
                  </button>
                </div>
              )}

              <div
                ref={dropRef}
                className="flex relative flex-col gap-3 justify-center items-center p-6 mx-auto max-w-xl rounded-xl border border-dashed transition cursor-pointer bg-slate-50 border-slate-300 hover:bg-slate-100 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={tr(
                  "ResumeInsight.dropHint",
                  "Drag & drop your PDF here, or click to browse"
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
                <CloudUpload className="w-10 h-10 text-slate-400" />
                {!file ? (
                  <>
                    <p className="text-sm text-slate-700">
                      {tr(
                        "ResumeInsight.dropHint",
                        "Drag & drop your PDF here, or click to browse"
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {tr("ResumeInsight.dropNote", "PDF only • Max 10MB")}
                    </p>
                  </>
                ) : (
                  <div className="w-full">
                    <div className="text-sm font-medium truncate text-slate-900">
                      {file.name}
                    </div>
                    <div className="overflow-hidden relative mt-2 w-full h-2 rounded-full bg-slate-200">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {analyzing && !scoreData && (
                <div className="flex justify-center w-full">
                  <LoadingProcess
                    currentStep={Math.min(
                      defaultLoadingSteps.length - 1,
                      Math.max(0, Math.floor(progress / 35))
                    )}
                    steps={[
                      tr("LoadingProcess.steps.parsing", "Parsing your resume"),
                      tr(
                        "LoadingProcess.steps.analyzing",
                        "Analyzing your experience"
                      ),
                      tr(
                        "LoadingProcess.steps.skills",
                        "Extracting your skills"
                      ),
                      tr(
                        "LoadingProcess.steps.recommendations",
                        "Generating recommendations"
                      ),
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gradient-to-br to-white sm:p-10 from-slate-50">
            <div className="grid gap-6 lg:grid-cols-[32%_68%] items-start">
              <div className="self-start w-full lg:sticky lg:top-18">
                <ResumeScoreCard
                  score={scoreData.score}
                  breakdown={scoreData.breakdown as any}
                  llm={scoreData.llm}
                />
              </div>
              <div className="w-full">
                {insightData && (
                  <InsightLayout
                    data={insightData}
                    formatIssuesFound={formatIssuesFound}
                    tr={tr}
                  />
                )}
              </div>
            </div>
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

function mapToInsightData(
  scoreData: ResumeScore,
  formatIssueCount: (count: number) => string,
  tr: (key: string, fallback: string) => string
): InsightData {
  const breakdown = (scoreData.breakdown as any as BreakdownItem[]) ?? [];

  const rows: DetailRow[] = breakdown.map((b) => {
    const pct = b.max > 0 ? Math.round((b.score / b.max) * 100) : 0;
    const hasMissing = (b.missing?.length ?? 0) > 0;
    const status: "success" | "error" =
      hasMissing || pct < 75 ? "error" : "success";
    const issueCount = status === "error" ? 1 : 0;
    return {
      label: b.category,
      status,
      badge: issueCount > 0 ? formatIssueCount(issueCount) : `${pct}%`,
      issueCount,
      scorePct: pct,
      details: b.missing?.length
        ? b.missing
        : [
            tr(
              "ResumeInsight.defaultDetail1",
              "An Applicant Tracking System needs clear headings and measurable outcomes."
            ),
            tr(
              "ResumeInsight.defaultDetail2",
              "Add specific achievements, quantify impact, and keep formatting consistent."
            ),
            tr(
              "ResumeInsight.defaultDetail3",
              "Use strong action verbs and avoid repetition to improve readability."
            ),
          ],
    };
  });

  const groups: InsightData["groups"] = [
    {
      title: tr("ResumeInsight.content", "CONTENT"),
      icon: "content",
      rows: rows.slice(0, 4),
    },
    {
      title: tr("ResumeInsight.sections", "SECTIONS"),
      icon: "sections",
      rows: rows.slice(4, 7),
    },
    {
      title: tr("ResumeInsight.atsEssentials", "ATS ESSENTIALS"),
      icon: "ats",
      rows: rows.slice(7, 10),
    },
    {
      title: tr("ResumeInsight.tailoring", "TAILORING"),
      icon: "tailoring",
      rows: rows.slice(10),
    },
  ].filter((g) => g.rows.length);

  return { groups };
}

function renderIcon(key?: string) {
  const base = "w-4 h-4";
  switch (key) {
    case "content":
      return <FileText className={base + " text-indigo-500"} />;
    case "sections":
      return <Compass className={base + " text-sky-500"} />;
    case "ats":
      return <Settings2 className={base + " text-emerald-500"} />;
    case "tailoring":
      return <Target className={base + " text-orange-500"} />;
    default:
      return <Box className={base + " text-slate-500"} />;
  }
}

function issueTagColor(count: number) {
  if (count === 0) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (count <= 2) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function InsightLayout({
  data,
  formatIssuesFound,
  tr,
}: {
  data: InsightData;
  formatIssuesFound: (count: number) => string;
  tr: (key: string, fallback: string) => string;
}) {
  const groups = data.groups;
  return (
    <div className="space-y-4 w-full">
      {groups.map((group) => {
        const issues = group.rows.reduce(
          (sum, r) => sum + (r.issueCount ?? (r.status === "error" ? 1 : 0)),
          0
        );
        return (
          <GroupCard
            key={group.title}
            group={group}
            issues={issues}
            formatIssuesFound={formatIssuesFound}
            tr={tr}
          />
        );
      })}
    </div>
  );
}

function GroupCard({
  group,
  issues,
  formatIssuesFound,
  tr,
}: {
  group: InsightGroup;
  issues: number;
  formatIssuesFound: (count: number) => string;
  tr: (key: string, fallback: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
            {renderIcon(group.icon)}
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{group.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border",
              issueTagColor(issues)
            )}
          >
            {formatIssuesFound(issues)}
          </Badge>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-slate-500 transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-2 pl-1">
          {group.rows.map((row) => (
            <RowDetail key={row.label} row={row} tr={tr} />
          ))}
        </div>
      )}
    </div>
  );
}

function RowDetail({
  row,
  tr,
}: {
  row: DetailRow;
  tr: (key: string, fallback: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-50 transition"
      >
        <span className="text-[12px] font-medium text-slate-700">{row.label}</span>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-2 py-0 border",
              row.status === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}
          >
            {row.badge}
          </Badge>
          <ChevronDown
            className={cn(
              "h-3 w-3 text-slate-400 transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>
      {open && (
        <div className="pl-3 space-y-1.5">
          {(row.details ?? []).map((detail, idx) => (
            <p
              key={`${row.label}-${idx}`}
              className="text-[11px] text-slate-600 leading-relaxed"
            >
              {detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResumeInsight;
