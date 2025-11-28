 "use client";

import { Clock, Sparkles, Send } from "lucide-react";
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
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0e0f10] px-6 py-10 text-white sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at top, #c8ff2b33 0, transparent 55%), radial-gradient(circle at bottom, #7f5cff33 0, transparent 50%)",
          }}
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
            {tr("AiAutoApplySection.badge", "AI Auto‑Apply")}
          </p>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {tr(
              "AiAutoApplySection.title",
              "Let AI apply for you while you focus on your career",
            )}
          </h2>
          <p className="text-sm text-white/70 sm:text-base">
            {tr(
              "AiAutoApplySection.subtitle",
              "Serrbi AI Auto‑Apply takes care of repetitive applications so you can invest your energy in real career moves.",
            )}
          </p>

          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-white/80 sm:text-sm">
            <span className="opacity-80">
              {tr("AiAutoApplySection.equation.label", "Example:")}
            </span>
            <span className="font-semibold text-white">
              {tr("AiAutoApplySection.equation.left", "15 min")}
            </span>
            <span className="opacity-70">×</span>
            <span className="font-semibold text-white">
              {tr(
                "AiAutoApplySection.equation.middle",
                "15 applications / day",
              )}
            </span>
            <span className="opacity-70">=</span>
            <span className="font-semibold text-[#c8ff2b]">
              {tr(
                "AiAutoApplySection.equation.right",
                "225 min ≈ 3 hours saved",
              )}
            </span>
          </div>
        </div>

        {/* How Auto-Apply helps */}
        <div className="relative mt-10 grid gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold">
              {tr("AiAutoApplySection.cards.time.title", "Win back hours every week")}
            </h3>
            <p className="text-xs text-white/70">
              {tr(
                "AiAutoApplySection.cards.time.body",
                "Instead of manually filling forms for every role, Auto‑Apply queues and submits your best‑fit applications automatically — compounding time saved over days and weeks.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold">
              {tr(
                "AiAutoApplySection.cards.matching.title",
                "AI‑matched jobs, not random spam",
              )}
            </h3>
            <p className="text-xs text-white/70">
              {tr(
                "AiAutoApplySection.cards.matching.body",
                "Serrbi learns your categories, roles and keywords, then surfaces the closest matches so applications go to the right jobs — not every listing on the internet.",
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <Send className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold">
              {tr(
                "AiAutoApplySection.cards.control.title",
                "Automatic sends + one‑click manual apply",
              )}
            </h3>
            <p className="text-xs text-white/70">
              {tr(
                "AiAutoApplySection.cards.control.body",
                "Auto‑Apply can send for you on a schedule, and you can still review and apply manually to standout roles in one click — with your resume already attached.",
              )}
            </p>
          </div>
        </div>

        {/* What to do with saved time */}
        <div className="relative mt-8 grid gap-4 text-left sm:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              {tr(
                "AiAutoApplySection.useTime.cv.title",
                "Polish your CV & profile",
              )}
            </p>
            <p className="text-xs text-white/70">
              {tr(
                "AiAutoApplySection.useTime.cv.body",
                "Refine your resume with the AI analyzer, update your portfolio, and align your story with your target roles.",
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              {tr(
                "AiAutoApplySection.useTime.skills.title",
                "Learn high‑impact skills",
              )}
            </p>
            <p className="text-xs text-white/70">
              {tr(
                "AiAutoApplySection.useTime.skills.body",
                "Use the freed‑up hours to take a course, build a side project, or deepen the skills that move you to the next level.",
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              {tr(
                "AiAutoApplySection.useTime.plan.title",
                "Prepare interviews & roadmap",
              )}
            </p>
            <p className="text-xs text-white/70">
              {tr(
                "AiAutoApplySection.useTime.plan.body",
                "Rehearse answers, research companies, and use the career switch planner to map where you’re going next.",
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AiAutoApplySection;


