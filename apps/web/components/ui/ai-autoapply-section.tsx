"use client";

import {
  Clock,
  Sparkles,
  Send,
  FileText,
  BookOpen,
  Target,
} from "lucide-react";
import { useTranslations } from "next-intl";

type AiAutoApplySectionProps = {
  requireLogin?: boolean;
  callbackUrl?: string;
};

export function AiAutoApplySection(_: AiAutoApplySectionProps) {
  const tAll = useTranslations();
  const tr = (key: string, fallback: string) =>
    (tAll as any).has?.(key) ? (tAll as any)(key) : fallback;

  return (
    <section className="mx-auto mt-10 w-full">
      <div className="overflow-hidden relative px-6 py-10 bg-white rounded-3xl border border-gray-200 shadow-sm text-slate-900 sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at top, #e0e7ff66 0, transparent 55%), radial-gradient(circle at bottom, #f9731666 0, transparent 50%)",
          }}
        />

        <div className="flex relative flex-col gap-4 items-center mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {tr("AiAutoApplySection.badge", "AI auto‑apply")}
          </p>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {tr(
              "AiAutoApplySection.title",
              "AI auto‑apply that gives you your time back",
            )}
          </h2>
          <p className="text-sm text-slate-600 sm:text-base">
            {tr(
              "AiAutoApplySection.subtitle",
              "Serrbi sends repetitive applications for you so you can use that time to actually grow your career.",
            )}
          </p>

          <div className="inline-flex flex-wrap gap-2 justify-center items-center px-4 py-2 mt-4 text-xs font-medium rounded-full bg-slate-100 text-slate-700 sm:text-sm">
            <span className="opacity-80">
              {tr("AiAutoApplySection.equation.label", "Example:")}
            </span>
            <span className="inline-flex gap-1 items-center font-semibold text-slate-900">
              <Clock className="w-3 h-3" />
              {tr("AiAutoApplySection.equation.left", "15 min")}
            </span>
            <span className="opacity-50">×</span>
            <span className="font-semibold text-slate-900">
              {tr(
                "AiAutoApplySection.equation.middle",
                "15 applications / day",
              )}
            </span>
            <span className="opacity-50">=</span>
            <span className="font-semibold text-violet-600">
              {tr(
                "AiAutoApplySection.equation.right",
                "225 min ≈ 3 hours back",
              )}
            </span>
          </div>
        </div>

        {/* How Auto‑Apply helps */}
        <div className="grid relative gap-4 mt-8 sm:grid-cols-3">
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
            <div className="flex justify-center items-center w-9 h-9 text-violet-600 bg-violet-50 rounded-full">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold">
              {tr("AiAutoApplySection.cards.time.title", "Save hours, every week")}
            </h3>
            <p className="text-xs text-slate-600">
              {tr(
                "AiAutoApplySection.cards.time.body",
                "Auto‑Apply fills and sends the repetitive applications in the background.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
            <div className="flex justify-center items-center w-9 h-9 text-violet-600 bg-violet-50 rounded-full">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold">
              {tr(
                "AiAutoApplySection.cards.matching.title",
                "Smart, AI‑matched jobs",
              )}
            </h3>
            <p className="text-xs text-slate-600">
              {tr(
                "AiAutoApplySection.cards.matching.body",
                "Serrbi targets roles that match your profile instead of spamming every listing.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
            <div className="flex justify-center items-center w-9 h-9 text-violet-600 bg-violet-50 rounded-full">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold">
              {tr(
                "AiAutoApplySection.cards.control.title",
                "You keep full control",
              )}
            </h3>
            <p className="text-xs text-slate-600">
              {tr(
                "AiAutoApplySection.cards.control.body",
                "Toggle auto‑apply or send standout roles yourself in one click.",
              )}
            </p>
          </div>
        </div>

        {/* What to do with saved time */}
        <div className="grid relative gap-4 mt-8 sm:grid-cols-3">
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
            <div className="flex justify-center items-center w-9 h-9 text-violet-600 bg-violet-50 rounded-full">
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-700">
              {tr(
                "AiAutoApplySection.useTime.cv.title",
                "Polish your resume",
              )}
            </p>
            <p className="text-xs text-slate-600">
              {tr(
                "AiAutoApplySection.useTime.cv.body",
                "Use the AI resume analyzer to tighten your CV and profile.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
            <div className="flex justify-center items-center w-9 h-9 text-violet-600 bg-violet-50 rounded-full">
              <BookOpen className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-700">
              {tr(
                "AiAutoApplySection.useTime.skills.title",
                "Learn new skills",
              )}
            </p>
            <p className="text-xs text-slate-600">
              {tr(
                "AiAutoApplySection.useTime.skills.body",
                "Invest freed‑up time into courses and projects that grow you.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
            <div className="flex justify-center items-center w-9 h-9 text-violet-600 bg-violet-50 rounded-full">
              <Target className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-700">
              {tr(
                "AiAutoApplySection.useTime.plan.title",
                "Plan your next move",
              )}
            </p>
            <p className="text-xs text-slate-600">
              {tr(
                "AiAutoApplySection.useTime.plan.body",
                "Use Serrbi career tools to map your path and prepare interviews.",
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AiAutoApplySection;

