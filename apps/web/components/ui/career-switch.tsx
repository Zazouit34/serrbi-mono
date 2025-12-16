"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { toast } from "sonner";
import { TrendingUp, Clock } from "lucide-react";

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

const difficultyStyles: Record<
  CareerPath["difficulty"],
  { badge: string; text: string }
> = {
  Easy: {
    badge: "bg-emerald-100 text-emerald-900",
    text: "text-emerald-600",
  },
  Moderate: {
    badge: "bg-amber-100 text-amber-900",
    text: "text-amber-600",
  },
  Challenging: {
    badge: "bg-rose-100 text-rose-900",
    text: "text-rose-600",
  },
};

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
  const [error, setError] = useState<string | null>(null);
  const advisorSummary = useMemo(
    () => buildAdvisorSummary(paths, formData),
    [paths, formData.currentRole, formData.interests, formData.targetIndustry],
  );
  const primaryPath = paths[0];
  const alternativePaths = paths.slice(1);

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
      <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-[0_60px_80px_rgba(15,23,42,0.1)]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl lg:text-3xl font-semibold">{t("form.title")}</CardTitle>
          <CardDescription className="text-slate-500">{t("form.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-6 py-6">
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

          <div className="space-y-3">
            <Button
              onClick={handleGenerate}
              disabled={isAnalyzing}
              className="bg-slate-900 text-white hover:bg-slate-950 focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {t("form.analyzing")}
                </span>
              ) : (
                t("form.submit")
              )}
            </Button>
            <p className="text-sm text-slate-500">{t("advisor.formHint")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/70 px-6 py-8 text-center shadow-sm">
            <span className="h-14 w-14 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
            <div>
              <p className="text-lg font-semibold text-slate-900">{t("advisor.loadingTitle")}</p>
              <p className="text-sm text-slate-500">{t("advisor.loadingCopy")}</p>
            </div>
          </div>
        ) : advisorSummary ? (
          <Card className="rounded-3xl border border-slate-200 bg-slate-50/80 px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
              {t("advisor.insightLabel")}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{advisorSummary}</p>
            <p className="text-sm text-slate-500">{t("advisor.insightCopy")}</p>
          </Card>
        ) : paths.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70">
            <CardContent className="py-10 space-y-3 text-center text-slate-600">
              <p className="text-xl font-semibold text-slate-900">
                {t("advisor.listeningTitle")}
              </p>
              <p className="text-sm">{t("advisor.listeningBody1")}</p>
              <p className="text-sm">{t("advisor.listeningBody2")}</p>
            </CardContent>
          </Card>
        ) : null}

        {paths.length > 0 && (
          <div className="space-y-8">
            <div className="flex justify-center px-2">
              <div className="w-full max-w-4xl">
                {primaryPath && (
                  <PrimaryPathCard
                    path={primaryPath}
                    tradeoff={describeTradeoff(primaryPath)}
                    translate={t}
                  />
                )}
              </div>
            </div>
            {alternativePaths.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {t("advisor.alternativeLabel")}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {alternativePaths.map((path, index) => (
                    <AlternativePathCard
                      key={`${path.title}-${index}`}
                      path={path}
                      tradeoff={describeTradeoff(path)}
                      salaryGrowth={formatSalaryGrowth(path)}
                      translate={t}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type PathCardProps = {
  path: CareerPath;
  tradeoff: string;
  translate: TranslateFn;
};

type AlternativePathCardProps = PathCardProps & {
  salaryGrowth: string;
};

function PrimaryPathCard({ path, tradeoff, translate }: PathCardProps) {
  return (
    <Card className="rounded-3xl border border-emerald-300 bg-gradient-to-b from-white via-white to-emerald-50 shadow-[0_30px_80px_rgba(16,185,129,0.25)] ring-1 ring-emerald-100">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] px-3 py-1 rounded-full">
            {translate("advisor.recommendedBadge")}
          </Badge>
          <Badge className={difficultyStyles[path.difficulty].badge}>
            {translate(`difficulty.${path.difficulty}`)}
          </Badge>
        </div>
        <div>
          <CardTitle className="text-3xl font-semibold text-slate-900">{path.title}</CardTitle>
          <CardDescription className="text-sm text-slate-500">{tradeoff}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <SalaryBlock path={path} translate={translate} />
        <EvidenceBlock skills={path.requiredSkills} translate={translate} />
        <StepsBlock steps={path.steps} translate={translate} />
      </CardContent>
    </Card>
  );
}

function AlternativePathCard({ path, tradeoff, salaryGrowth, translate }: AlternativePathCardProps) {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-50">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-semibold text-slate-900">{path.title}</CardTitle>
            <p className="text-sm text-slate-500">{tradeoff}</p>
          </div>
          <Badge className={difficultyStyles[path.difficulty].badge}>
            {translate(`difficulty.${path.difficulty}`)}
          </Badge>
        </div>
        <CardDescription className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex gap-1 items-center">
            <Clock className="w-4 h-4" />
            {path.timeToTransition}
          </span>
          <span className="inline-flex gap-1 items-center">
            <TrendingUp className="w-4 h-4" />
            {salaryGrowth}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        <SalaryBlock path={path} translate={translate} />
        <EvidenceBlock skills={path.requiredSkills} translate={translate} />
        <StepsBlock steps={path.steps} translate={translate} />
      </CardContent>
    </Card>
  );
}

function SalaryBlock({ path, translate }: { path: CareerPath; translate: TranslateFn }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="p-4 rounded-2xl bg-slate-50">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          {translate("results.currentSalary")}
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900">
          {formatSalary(path.currentSalary)}
        </p>
      </div>
      <div className="p-4 rounded-2xl bg-emerald-50/40">
        <p className="text-xs text-emerald-700 uppercase tracking-[0.3em]">
          {translate("results.targetSalary")}
        </p>
        <p className="mt-1 text-lg font-semibold text-emerald-900">
          {formatSalary(path.targetSalary)}
        </p>
      </div>
    </div>
  );
}

function EvidenceBlock({ skills, translate }: { skills: string[]; translate: TranslateFn }) {
  const evidence = skills.slice(0, 5);
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
        {translate("advisor.evidenceLabel")}
      </p>
      <div className="flex flex-wrap gap-2 text-sm text-slate-600">
        {evidence.map((skill) => (
          <span
            key={skill}
            className="px-3 py-1 rounded-full bg-slate-100 text-slate-700"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepsBlock({ steps, translate }: { steps: string[]; translate: TranslateFn }) {
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
        {translate("advisor.roadmapLabel")}
      </p>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={`${step}-${index}`} className="flex gap-3 items-start">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ${
                index === 0
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {index === 0
                  ? translate("advisor.immediateMove")
                  : translate("advisor.nextStep", { index: index + 1 })}
              </p>
              <p className="text-sm text-slate-600">{step}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

