"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Tag } from "./tag";
import { cn } from "@workspace/ui/lib/utils";
import {
  FileText,
  Compass,
  Settings2,
  Target,
  ChevronDown,
} from "lucide-react";

type DetailRow = {
  label: string;
  status: "success" | "error";
  badge: string;
  details: string[];
};

type InsightGroup = {
  title: string;
  icon?: string;
  rows: DetailRow[];
};

const insightGroups: InsightGroup[] = [
  {
    title: "CONTENT",
    icon: "content",
    rows: [
      {
        label: "ATS Parse Rate",
        status: "success",
        badge: "No issues",
        details: ["Structure is machine-readable", "Sections properly labeled"],
      },
      {
        label: "Quantifying Impact",
        status: "error",
        badge: "3 issues",
        details: [
          "Add metrics to at least two recent roles",
          "Highlight scope (team size, budget, markets)",
          "Surface outcomes (revenue, cost, efficiency)",
        ],
      },
      {
        label: "Repetition",
        status: "success",
        badge: "No issues",
        details: ["Good variety of verbs", "No duplicated bullet patterns"],
      },
      {
        label: "Spelling & Grammar",
        status: "error",
        badge: "1 issue",
        details: ["Fix typos in summary and last experience bullet"],
      },
    ],
  },
  {
    title: "SECTIONS",
    icon: "sections",
    rows: [
      {
        label: "Essential Sections",
        status: "success",
        badge: "OK",
        details: ["Experience, Education, Skills present", "Summary included"],
      },
      {
        label: "Contact Information",
        status: "success",
        badge: "OK",
        details: ["Email/Phone present", "Location included", "LinkedIn provided"],
      },
    ],
  },
  {
    title: "ATS ESSENTIALS",
    icon: "ats",
    rows: [
      {
        label: "File Format",
        status: "success",
        badge: "OK",
        details: ["PDF format", "Text is selectable"],
      },
      {
        label: "Design",
        status: "success",
        badge: "OK",
        details: ["Minimal color use", "Readable fonts"],
      },
      {
        label: "Email Address",
        status: "success",
        badge: "OK",
        details: ["Professional handle"],
      },
      {
        label: "Hyperlink in Header",
        status: "error",
        badge: "Review",
        details: ["Move links to body/footer to ensure ATS parsing"],
      },
    ],
  },
  {
    title: "TAILORING",
    icon: "tailoring",
    rows: [
      {
        label: "Hard Skills",
        status: "success",
        badge: "OK",
        details: ["Core tech stack captured", "Role keywords present"],
      },
      {
        label: "Soft Skills",
        status: "success",
        badge: "OK",
        details: ["Collaboration and leadership noted"],
      },
      {
        label: "Action Verbs",
        status: "error",
        badge: "Improve",
        details: ["Swap passive phrases for strong verbs in 2 bullets"],
      },
      {
        label: "Tailored Title",
        status: "success",
        badge: "OK",
        details: ["Headline matches target role"],
      },
    ],
  },
];

function statusColor(status: "success" | "error") {
  return status === "success"
    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
    : "bg-amber-50 text-amber-800 border border-amber-100";
}

function issueTagColor(count: number) {
  if (count <= 1) return "bg-slate-100 text-slate-700";
  if (count <= 3) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function renderIcon(key?: string) {
  const base = "w-5 h-5";
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
      return null;
  }
}

export function ResumeInsightTest() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {insightGroups.map((group) => {
        const issues = group.rows.filter((r) => r.status === "error").length;
        return (
          <div
            key={group.title}
            className="rounded-2xl border border-[#e6ebf1] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-800">
                {renderIcon(group.icon)}
                <h3 className="text-lg font-semibold tracking-wide text-slate-900">{group.title}</h3>
              </div>
              <Tag className={cn("text-xs font-semibold px-3 py-1 rounded-full shadow-sm", issueTagColor(issues))}>
                {issues} issue{issues === 1 ? "" : "s"} found
              </Tag>
            </div>

            <div className="mt-4 space-y-4">
              {group.rows.map((row) => (
                <Collapsible key={row.label} defaultOpen={false}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 shadow-sm border border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="text-[18px] font-semibold text-slate-800">{row.label}</span>
                        <span
                          className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-full",
                            statusColor(row.status),
                          )}
                        >
                          {row.badge}
                        </span>
                      </div>
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-1 pt-2 pb-1">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {row.details.map((detail, idx) => (
                        <div
                          key={`${row.label}-${idx}`}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm min-h-[96px] flex items-start"
                        >
                          {detail}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default ResumeInsightTest;

