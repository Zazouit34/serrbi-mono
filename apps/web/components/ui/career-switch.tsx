"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "sonner";
import { ChevronDown, Sparkles } from "lucide-react";

type CareerPath = {
  title: string;
  currentSalary: { min: number; max: number };
  targetSalary: { min: number; max: number };
  timeToTransition: string;
  requiredSkills: string[];
  steps: string[];
  difficulty: "Easy" | "Moderate" | "Challenging";
};

const industries = ["tech", "finance", "healthcare", "ecommerce", "consulting", "startup"] as const;
const timeframes = ["3-6", "6-12", "1-2", "flexible"] as const;
const budgets = ["0-25k", "25-50k", "50-100k", "100k+"] as const;

const timelineDescriptions: Record<string, string> = {
  "3-6": "Quick 3-6 month ramp",
  "6-12": "Balanced 6-12 month pace",
  "1-2": "Longer 1-2 year shift",
  flexible: "Flexible, adaptive timeline",
};

const difficultyNotes: Record<CareerPath["difficulty"], string> = {
  Easy: "Light learning lift",
  Moderate: "Requires new skills with focus",
  Challenging: "Ambitious growth, heavier lift",
};

type TranslateFn = ReturnType<typeof useTranslations>;

function describeTradeoff(path: CareerPath) {
  const timeline = timelineDescriptions[path.timeToTransition] ?? `${path.timeToTransition} month timeline`;
  const difficulty = difficultyNotes[path.difficulty];
  const salaryGap = path.targetSalary.min - path.currentSalary.min;
  const salaryNote =
    salaryGap >= 15000
      ? "High salary upside"
      : salaryGap >= 5000
        ? "Steady growth"
        : "Stable income";
  return `${timeline} · ${difficulty} · ${salaryNote}`;
}

function buildAdvisorSummary(paths: CareerPath[], formData: FormState) {
  if (!paths.length) return "";
  const primaryTitle = paths[0]!.title;
  const role = formData.currentRole ? `${formData.currentRole}` : "your current experience";
  const interest = formData.interests ? ` and your interest in ${formData.interests}` : "";
  const industry = formData.targetIndustry ? `, with a focus on ${formData.targetIndustry}` : "";
  return `Based on ${role}${interest}${industry}, Serrbi recommends the ${primaryTitle} path as the most grounded next chapter.`;
}

function formatSalary(range: { min: number; max: number }) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  return `${formatter.format(range.min)} - ${formatter.format(range.max)}`;
}

function formatSalaryGrowth(path: CareerPath) {
  const growth = Math.round(
    ((path.targetSalary.min - path.currentSalary.min) / Math.max(path.currentSalary.min, 1)) * 100,
  );
  return `${growth > 0 ? "+" : ""}${growth}% salary gap`;
}

type FormState = {
  currentRole: string;
  currentSkills: string;
  interests: string;
  targetIndustry: string;
  timeframe: string;
  budget: string;
};

const initialForm: FormState = {
  currentRole: "",
  currentSkills: "",
  interests: "",
  targetIndustry: "",
  timeframe: "",
  budget: "",
};

export function CareerSwitchPlanner() {
  const t = useTranslations("CareerSwitch");
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [roadmapVisible, setRoadmapVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const advisorSummary = useMemo(
    () => buildAdvisorSummary(paths, formData),
    [paths, formData.currentRole, formData.interests, formData.targetIndustry],
  );
  const primaryPath = paths[0];

  useEffect(() => {
    if (!paths.length) {
      setRoadmapVisible(false);
      return;
    }
    setRoadmapVisible(false);
    const timer = setTimeout(() => setRoadmapVisible(true), 200);
    return () => clearTimeout(timer);
  }, [paths.length]);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.currentRole || !formData.interests) {
      toast.error(t("toasts.missing.title"), {
        description: t("toasts.missing.description"),
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "careerSwitch",
          payload: formData,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || t("errors.generic"));
      }

      const receivedPaths = Array.isArray(data.paths)
        ? data.paths
        : Array.isArray(data?.result?.paths)
          ? data.result.paths
          : [];

      if (!receivedPaths.length) {
        throw new Error(t("errors.empty"));
      }

      setPaths(receivedPaths.slice(0, 3));
      toast.success(t("toasts.success.title"), {
        description: t("toasts.success.description"),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errors.generic");
      setError(message);
      toast.error(t("toasts.failure.title"), {
        description: message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="space-y-1 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            {t("form.introTitle")}
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">{t("form.title")}</h2>
          <p className="text-sm text-slate-500">{t("form.introSubtitle")}</p>
        </div>
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white/80 p-5 lg:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currentRole">{t("form.currentRole")}</Label>
              <Input
                id="currentRole"
                value={formData.currentRole}
                onChange={(e) => handleChange("currentRole", e.target.value)}
                placeholder={t("form.placeholders.currentRole")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentSkills">{t("form.currentSkills")}</Label>
              <Input
                id="currentSkills"
                value={formData.currentSkills}
                onChange={(e) => handleChange("currentSkills", e.target.value)}
                placeholder={t("form.placeholders.currentSkills")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interests">{t("form.interests")}</Label>
            <Input
              id="interests"
              value={formData.interests}
              onChange={(e) => handleChange("interests", e.target.value)}
              placeholder={t("form.placeholders.interests")}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("form.targetIndustry")}</Label>
              <Select
                value={formData.targetIndustry}
                onValueChange={(value) => handleChange("targetIndustry", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.placeholders.targetIndustry")} />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`form.options.industries.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("form.timeframe")}</Label>
              <Select
                value={formData.timeframe}
                onValueChange={(value) => handleChange("timeframe", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.placeholders.timeframe")} />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`form.options.timeframes.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("form.budget")}</Label>
              <Select
                value={formData.budget}
                onValueChange={(value) => handleChange("budget", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.placeholders.budget")} />
                </SelectTrigger>
                <SelectContent>
                  {budgets.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`form.options.budgets.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="space-y-2">
            <Button
              onClick={handleGenerate}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-700 hover:to-fuchsia-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {t("form.analyzing")}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {t("form.submit")}
                </span>
              )}
            </Button>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
              {t("form.currentSnapshotLabel")}
            </p>
            <p className="text-xs text-slate-500">{t("advisor.formHint")}</p>
          </div>
        </div>
      </section>

      {isAnalyzing ? (
        <div className="flex items-center gap-4 rounded-2xl border border-purple-200 bg-purple-50/80 px-4 py-3 text-purple-900">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-transparent" />
          <div>
            <p className="font-semibold">{t("advisor.loadingTitle")}</p>
            <p className="text-sm text-purple-700">{t("advisor.loadingCopy")}</p>
          </div>
        </div>
      ) : advisorSummary ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm text-slate-700">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {t("advisor.insightLabel")}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{advisorSummary}</p>
          <p className="text-sm text-slate-500">{t("advisor.insightCopy")}</p>
        </div>
      ) : null}

      <div className="space-y-6">
        {paths.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center text-slate-600">
            <p className="text-xl font-semibold text-slate-900">{t("advisor.listeningTitle")}</p>
            <p className="text-sm">{t("advisor.listeningBody1")}</p>
            <p className="text-sm">{t("advisor.listeningBody2")}</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
            <CurrentCareerSnapshot formData={formData} translate={t} />
            <ComparisonArrow label={t("comparison.arrowLabel")} />
            {primaryPath && (
              <SuggestedCareerSnapshot
                path={primaryPath}
                translate={t}
                tradeoff={describeTradeoff(primaryPath)}
                roadmapVisible={roadmapVisible}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type CurrentCareerSnapshotProps = {
  formData: FormState;
  translate: TranslateFn;
};

function CurrentCareerSnapshot({ formData, translate }: CurrentCareerSnapshotProps) {
  const skills = formData.currentSkills
    ? formData.currentSkills
        .split(/[,\n]+/)
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 text-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{translate("comparison.currentTitle")}</p>
        <span className="text-xs text-slate-400">{translate("form.currentSnapshotLabel")}</span>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-semibold">
          {formData.currentRole || translate("comparison.currentPlaceholder")}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {formData.interests || translate("comparison.aboutPlaceholder")}
        </p>
      </div>
      <div className="mt-5 space-y-4 text-sm text-slate-600">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{translate("comparison.skillsLabel")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.length ? (
              skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-slate-400">{translate("comparison.skillsPlaceholder")}</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{translate("comparison.salaryLabel")}</p>
          <p className="text-lg font-semibold text-slate-900">
            {formData.budget || translate("comparison.salaryPlaceholder")}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{translate("comparison.timeframeLabel")}</p>
          <p className="font-semibold text-slate-900">
            {formData.timeframe || translate("comparison.timeframePlaceholder")}
          </p>
        </div>
      </div>
    </div>
  );
}

type SuggestedCareerSnapshotProps = {
  path: CareerPath;
  translate: TranslateFn;
  tradeoff: string;
  roadmapVisible: boolean;
};

function SuggestedCareerSnapshot({ path, tradeoff, translate, roadmapVisible }: SuggestedCareerSnapshotProps) {
  return (
    <div className="relative flex flex-col gap-6 rounded-3xl border border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/80 p-6 text-slate-900 shadow-[0_10px_30px_rgba(16,185,129,0.15)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-500">{translate("comparison.suggestedTitle")}</p>
          <h3 className="text-2xl font-semibold">{path.title}</h3>
          <p className="text-sm text-slate-700">{tradeoff}</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700">
          {translate("comparison.seeRoadmap")}
        </span>
      </div>
      <div className="space-y-5">
        <SalaryBlock path={path} translate={translate} />
        <EvidenceBlock skills={path.requiredSkills} translate={translate} />
        <RoadmapTimeline steps={path.steps} translate={translate} visible={roadmapVisible} />
      </div>
    </div>
  );
}

type RoadmapTimelineProps = {
  steps: string[];
  translate: TranslateFn;
  visible: boolean;
};

function RoadmapTimeline({ steps, translate, visible }: RoadmapTimelineProps) {
  return (
    <div
      className={`rounded-3xl border border-white/20 bg-slate-900/90 p-5 text-white transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.4em] text-slate-300">{translate("advisor.roadmapLabel")}</p>
      <div className="mt-4 space-y-4">
        {steps.map((step, index) => (
          <div key={`roadmap-${index}`} className="flex items-start gap-3">
            <span className="mt-1 h-3 w-3 rounded-full bg-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-white">
                {index === 0
                  ? translate("advisor.immediateMove")
                  : translate("advisor.nextStep", { index: index + 1 })}
              </p>
              <p className="text-sm text-slate-300">{step}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ComparisonArrowProps = {
  label: string;
};

function ComparisonArrow({ label }: ComparisonArrowProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.6em] text-slate-400">
      {[0, 1, 2].map((index) => (
        <ChevronDown key={index} className="h-5 w-5 text-emerald-500" />
      ))}
      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function SalaryBlock({ path, translate }: { path: CareerPath; translate: TranslateFn }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-700">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{translate("results.currentSalary")}</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{formatSalary(path.currentSalary)}</p>
      </div>
      <div className="rounded-2xl bg-emerald-50/60 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">{translate("results.targetSalary")}</p>
        <p className="mt-1 text-lg font-semibold text-emerald-900">{formatSalary(path.targetSalary)}</p>
      </div>
    </div>
  );
}

function EvidenceBlock({ skills, translate }: { skills: string[]; translate: TranslateFn }) {
  const evidence = skills.slice(0, 5);
  return (
    <div className="space-y-2 text-sm text-slate-600">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{translate("advisor.evidenceLabel")}</p>
      <div className="flex flex-wrap gap-2">
        {evidence.map((skill) => (
          <span key={skill} className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

