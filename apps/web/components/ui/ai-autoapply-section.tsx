"use client";

import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/button";
import AutoApplyExampleResults from "./ai-autoapply-component";

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
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[40px] bg-orange-500 p-6 sm:p-10 md:p-16">
        {/* Orange circles decoration */}
        <div className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-hidden md:block">
          <div className="absolute right-[-45%] top-1/2 h-[800px] w-[800px] -translate-y-1/2 aspect-square">
            <div className="absolute inset-0 rounded-full bg-orange-400 opacity-30" />
            <div className="absolute inset-0 scale-[0.8] rounded-full bg-orange-300 opacity-30" />
            <div className="absolute inset-0 scale-[0.6] rounded-full bg-orange-200 opacity-30" />
            <div className="absolute inset-0 scale-[0.4] rounded-full bg-orange-100 opacity-30" />
            <div className="absolute inset-0 scale-[0.2] rounded-full bg-orange-50 opacity-30" />
            <div className="absolute inset-0 scale-[0.1] rounded-full bg-white/50 opacity-30" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Text */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">
                {tr("AiAutoApplySection.badge", "AI auto‑apply")}
              </p>
              <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl xl:text-5xl">
                {tr(
                  "AiAutoApplySection.title",
                  "Let Serrbi apply for you while you focus on your career",
                )}
              </h2>
              <p className="mb-8 max-w-xl text-sm text-white/90 lg:text-lg">
                {tr(
                  "AiAutoApplySection.subtitle",
                  "Our AI auto‑apply scans the best matching roles and submits high‑quality applications for you, so you can use those hours to improve your resume, learn new skills, or prepare interviews.",
                )}
              </p>

              <Button
                asChild
                className="bg-black text-white hover:bg-black/80 rounded-full px-6 h-10 text-sm font-semibold"
              >
                <a href="/jobs/auto-apply">
                  {tr("AiAutoApplySection.cta", "Start AI auto‑apply")}
                </a>
              </Button>
            </div>

            {/* Auto Apply Component */}
            <div className="w-full">
              <AutoApplyExampleResults />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AiAutoApplySection;
