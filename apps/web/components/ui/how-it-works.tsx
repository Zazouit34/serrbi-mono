"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/button";

type Step = {
  key: string;
  href: string;
  image: string;
  bg: string;
  accent: string;
};

const steps: Step[] = [
  {
    key: "1",
    href: "/resume-analyzer",
    image:
      "https://images.unsplash.com/photo-1584907797015-7554cd315667?ixlib=rb-4.1.0&auto=format&fit=crop&w=1600&q=80",
    bg: "from-sky-50 via-white to-sky-100",
    accent: "text-sky-700 bg-sky-100",
  },
  {
    key: "2",
    href: "/career-switch",
    image:
      "https://images.unsplash.com/photo-1758874384554-a00d65bca8aa?ixlib=rb-4.1.0&auto=format&fit=crop&w=1600&q=80",
    bg: "from-emerald-50 via-white to-emerald-100",
    accent: "text-emerald-700 bg-emerald-100",
  },
  {
    key: "3",
    href: "/account/auto-apply",
    image:
      "https://plus.unsplash.com/premium_photo-1682309526815-efe5d6225117?ixlib=rb-4.1.0&auto=format&fit=crop&w=1600&q=80",
    bg: "from-amber-50 via-white to-amber-100",
    accent: "text-amber-700 bg-amber-100",
  },
];

export function HowItWorks() {
  const t = useTranslations("HowItWorks");
  const defaultStep = steps[0]!;
  const firstKey = defaultStep.key;
  const [activeKey, setActiveKey] = useState<string>(firstKey);

  const active = useMemo<Step>(
    () => steps.find((s) => s.key === activeKey) ?? defaultStep,
    [activeKey],
  );

  return (
    <section className="flex flex-col gap-12 py-18">
      <div className="flex flex-col gap-4 items-center text-center">
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">{t("title")}</h2>
        <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[260px_1fr] items-stretch">
        {/* Desktop nav (left) */}
        <div className="hidden md:flex h-full flex-col justify-between gap-4 self-stretch">
          {steps.map((step) => {
            const isActive = step.key === activeKey;
            const labelKey =
              step.key === "1"
                ? "resumeAnalyzer"
                : step.key === "2"
                  ? "careerSwitch"
                  : "aiSerrbi";
            return (
              <button
                key={step.key}
                onClick={() => setActiveKey(step.key)}
                className={`text-left rounded-2xl border px-4 py-3 transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-semibold">{t(`HowItWorks.nav.${labelKey}`)}</div>
              </button>
            );
          })}
        </div>

        {/* Content column */}
        <div className="flex flex-col gap-4">
          {/* Mobile stacked nav */}
          <div className="flex md:hidden flex-col gap-3">
            {steps.map((step) => {
              const isActive = step.key === activeKey;
              const labelKey =
                step.key === "1"
                  ? "resumeAnalyzer"
                  : step.key === "2"
                    ? "careerSwitch"
                    : "aiSerrbi";
              return (
                <button
                  key={step.key}
                  onClick={() => setActiveKey(step.key)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                <div className="text-sm font-semibold">{t(`HowItWorks.nav.${labelKey}`)}</div>
                </button>
              );
            })}
          </div>

          {/* Active card */}
          <div className={`relative overflow-hidden rounded-[32px] bg-gradient-to-br ${active.bg} p-6 sm:p-8 md:p-9`}>
            <div className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-hidden md:block">
              <div className="absolute right-[-35%] top-1/2 h-[560px] w-[560px] -translate-y-1/2 aspect-square opacity-30">
                <div className="absolute inset-0 rounded-full bg-white" />
              </div>
            </div>

            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-stretch md:min-h-[260px] lg:min-h-[280px]">
              {/* Image (left on desktop, stacked on mobile) */}
              <div className="relative h-48 w-full overflow-hidden rounded-2xl shadow-inner bg-white/50 md:hidden">
                <Image
                  src={active.image}
                  alt={t(`steps.${active.key}.title`)}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority
                />
              </div>
              <div className="hidden md:flex md:w-[40%] md:max-w-[320px] lg:max-w-[360px]">
                <div className="relative h-[260px] w-full overflow-hidden rounded-2xl shadow-inner bg-white/40">
                  <Image
                    src={active.image}
                    alt={t(`steps.${active.key}.title`)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1200px) 40vw, 32vw"
                    priority
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col justify-between gap-4 md:pl-2">
                <div className="space-y-3">
                  <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${active.accent}`}>
                    {t(`steps.${active.key}.title`)}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                    {t(`steps.${active.key}.title`)}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-700">{t(`steps.${active.key}.description`)}</p>
                </div>
                <Button
                  asChild
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6 h-10 text-sm font-semibold w-fit"
                >
                  <a href={active.href}>{t(`steps.${active.key}.action`)}</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
