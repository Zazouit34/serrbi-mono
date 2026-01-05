"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Tags, TagsTrigger } from "@workspace/ui/components/ui/shadcn-io/tags";
import { cn } from "@workspace/ui/lib/utils";

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
    icon: "📄",
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
    icon: "🧭",
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
    icon: "⚙️",
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
    icon: "🎯",
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

export function ResumeInsightTest() {
  return (
    <div className="flex flex-col gap-5 w-full">
      {insightGroups.map((group) => {
        const issues = group.rows.filter((r) => r.status === "error").length;
        return (
          <div
            key={group.title}
            className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-800">
                {group.icon && (
                  <span className="text-xl" aria-hidden>
                    {group.icon}
                  </span>
                )}
                <h3 className="text-lg font-semibold tracking-wide">{group.title}</h3>
              </div>
              <Tags>
                <TagsTrigger className="rounded-full bg-white text-slate-700 shadow-sm px-3 py-1 text-xs">
                  {issues} issue{issues === 1 ? "" : "s"} found
                </TagsTrigger>
              </Tags>
            </div>

            <div className="mt-4 space-y-3">
              {group.rows.map((row) => (
                <Collapsible key={row.label} defaultOpen={false}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-3 shadow-sm border border-slate-200">
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
                      <Chevron />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-1 pt-2 pb-1">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {row.details.map((detail, idx) => (
                        <div
                          key={`${row.label}-${idx}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
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

