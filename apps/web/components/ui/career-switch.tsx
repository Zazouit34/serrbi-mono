"use client";

import { useMemo, useState } from "react";
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
import { ArrowRight, ArrowDown, Sparkles } from "lucide-react";

type FormState = {
  currentRole: string;
  currentSkills: string;
  interests: string;
  targetIndustry: string;
  timeframe: string;
  budget: string;
};

const industries = ["tech", "finance", "healthcare", "ecommerce", "consulting", "startup"] as const;
const timeframes = ["3-6", "6-12", "1-2", "flexible"] as const;
const budgets = ["0-25k", "25-50k", "50-100k", "100k+"] as const;

const initialForm: FormState = {
  currentRole: "",
  currentSkills: "",
  interests: "",
  targetIndustry: "",
  timeframe: "",
  budget: "",
};

type WorkExperience = {
  role: string;
  company: string;
  period: string;
  location: string;
};

type Snapshot = {
  title: string;
  about: string;
  workExperience: WorkExperience[];
  salary: { min: number; max: number };
  skills: string[];
  industry: string;
  timeframe: string;
  budget: string;
};

type RoadmapStep = {
  title: string;
  description: string;
};

type CareerAnalysis = {
  insight?: string;
  currentSnapshot: Snapshot;
  recommendedSnapshot: Snapshot;
  roadmap: RoadmapStep[];
};

type TranslateFn = ReturnType<typeof useTranslations>;

function formatSalary(range: { min: number; max: number }) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  return `${formatter.format(range.min)} - ${formatter.format(range.max)}`;
}

function parseSkills(skills: string) {
  return skills
    .split(/[\n,]+/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function buildSnapshotFromForm(formData: FormState, translate: TranslateFn): Snapshot {
  const skills = parseSkills(formData.currentSkills);
  return {
    title: formData.currentRole || translate("comparison.currentPlaceholder"),
    about: formData.interests || translate("comparison.aboutPlaceholder"),
    workExperience: [],
    salary: { min: 0, max: 0 },
    skills,
    industry: formData.targetIndustry || translate("comparison.industryPlaceholder"),
    timeframe: formData.timeframe || translate("comparison.timeframePlaceholder"),
    budget: formData.budget || translate("comparison.salaryPlaceholder"),
  };
}

function flattenSkills(skills: string[]) {
  return skills.length ? skills : ["—"];
}

function buildAdvisorMessage(analysis: CareerAnalysis | null) {
  if (!analysis?.recommendedSnapshot) return "";
  const recommended = analysis.recommendedSnapshot;
  const skillsCopy = recommended.skills.slice(0, 3).join(", ") || "new skills";
  const currentIndustry = analysis.currentSnapshot.industry.toLowerCase();
  const nextIndustry = recommended.industry.toLowerCase();
  return `${recommended.title} extends your ${currentIndustry} background toward ${nextIndustry} with ${skillsCopy}.`;
}

function SnapshotSection({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function SnapshotBlock({ snapshot, translate }: { snapshot: Snapshot; translate: TranslateFn }) {
  return (
    <div className="space-y-6 text-slate-900">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{translate("comparison.aboutLabel")}</p>
        <h3 className="text-2xl font-semibold text-slate-900">{snapshot.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{snapshot.about}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{translate("comparison.workExperience")}</p>
        <div className="mt-2 space-y-3 text-sm text-slate-500">
          {snapshot.workExperience.length ? (
            snapshot.workExperience.map((experience) => (
              <div key={`${experience.role}-${experience.company}`}>
                <p className="text-sm font-semibold text-slate-900">{experience.role}</p>
                <p>
                  {experience.company} · {experience.period}
                </p>
                <p className="text-xs text-slate-400">{experience.location}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">{translate("comparison.workPlaceholder")}</p>
          )}
        </div>
      </div>
      <SnapshotSection
        title={translate("comparison.salaryLabel")}
        description={snapshot.salary.min && snapshot.salary.max ? formatSalary(snapshot.salary) : translate("comparison.salaryPlaceholder")}
      />
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{translate("comparison.skillsLabel")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {flattenSkills(snapshot.skills).map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
      <SnapshotSection title={translate("comparison.industryLabel")} description={snapshot.industry} />
      <SnapshotSection title={translate("comparison.timeframeLabel")} description={snapshot.timeframe} />
      <SnapshotSection title={translate("comparison.budgetLabel")} description={snapshot.budget} />
    </div>
  );
}

function ComparisonArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-[0.5em]">
      <ArrowRight className="hidden lg:block h-6 w-6 bg-gradient-to-r from-purple-600 to-fuchsia-500 text-transparent bg-clip-text" style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
      <ArrowRight className="hidden lg:block h-6 w-6 bg-gradient-to-r from-purple-600 to-fuchsia-500 text-transparent bg-clip-text" style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
      <ArrowDown className="lg:hidden h-6 w-6 bg-gradient-to-b from-purple-600 to-fuchsia-500 text-transparent bg-clip-text" style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
      <ArrowDown className="lg:hidden h-6 w-6 bg-gradient-to-b from-purple-600 to-fuchsia-500 text-transparent bg-clip-text" style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
      <span className="text-[11px] bg-gradient-to-r from-purple-600 to-fuchsia-500 text-transparent bg-clip-text" style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }}>{label}</span>
    </div>
  );
}

function RoadmapPanel({ steps, visible, label }: { steps: RoadmapStep[]; visible: boolean; label: string }) {
  return (
    <div
      className={`space-y-6 rounded-3xl bg-white/80 p-6 transition duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <h3 className="text-xs uppercase tracking-[0.4em] text-slate-500">{label}</h3>
      <div className="space-y-5">
        {steps.map((step, index) => (
          <div key={step.title} className="relative pl-8">
            <span className="absolute left-3 top-0 h-full w-px bg-purple-100" />
            <span className="absolute left-1 top-1 h-3 w-3 rounded-full bg-purple-600" />
            <p className="text-sm font-semibold text-slate-900">{step.title}</p>
            <p className="text-sm text-slate-500">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CareerSwitchPlanner() {
  const t = useTranslations("CareerSwitch");
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [analysis, setAnalysis] = useState<CareerAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advisorSummary = useMemo(() => buildAdvisorMessage(analysis), [analysis]);
  const currentSnapshot = analysis?.currentSnapshot ?? buildSnapshotFromForm(formData, t);
  const recommendedSnapshot = analysis?.recommendedSnapshot;
  const roadmapReady = Boolean(analysis?.roadmap?.length);
  const insightCopy = analysis?.insight || advisorSummary;

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.currentRole.trim() || !formData.interests.trim()) {
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
        body: JSON.stringify({ action: "careerSwitch", payload: formData }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || t("errors.generic"));
      }

      if (!data.currentSnapshot || !data.recommendedSnapshot) {
        throw new Error(t("errors.invalidResponse"));
      }

      const nextAnalysis: CareerAnalysis = {
        insight: data.insight,
        currentSnapshot: data.currentSnapshot,
        recommendedSnapshot: data.recommendedSnapshot,
        roadmap: Array.isArray(data.roadmap) ? data.roadmap : [],
      };

      setAnalysis(nextAnalysis);
      setShowRoadmap(false);
      toast.success(t("toasts.success.title"), {
        description: t("toasts.success.description"),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.generic");
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
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{t("form.introTitle")}</p>
        <h2 className="text-3xl font-semibold text-slate-900">{t("form.title")}</h2>
        <p className="text-sm text-slate-500">{t("form.introSubtitle")}</p>
        <div className="space-y-3 rounded-2xl bg-white/80 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currentRole">{t("form.currentRole")}</Label>
              <Input
                id="currentRole"
                value={formData.currentRole}
                onChange={(event) => handleChange("currentRole", event.target.value)}
                placeholder={t("form.placeholders.currentRole")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentSkills">{t("form.currentSkills")}</Label>
              <Input
                id="currentSkills"
                value={formData.currentSkills}
                onChange={(event) => handleChange("currentSkills", event.target.value)}
                placeholder={t("form.placeholders.currentSkills")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interests">{t("form.interests")}</Label>
            <Input
              id="interests"
              value={formData.interests}
              onChange={(event) => handleChange("interests", event.target.value)}
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
              className="bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white hover:from-purple-700 hover:to-fuchsia-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500"
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
            {!analysis && (
              <>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{t("form.currentSnapshotLabel")}</p>
                <p className="text-xs text-slate-500">{t("advisor.formHint")}</p>
              </>
            )}
          </div>
        </div>
      </section>

      {insightCopy && analysis && (
        <div className="text-sm text-slate-700">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{t("advisor.insightLabel")}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{insightCopy}</p>
          <p className="text-sm text-slate-500">{t("advisor.insightCopy")}</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-4 text-slate-900">
              <SnapshotBlock snapshot={currentSnapshot} translate={t} />
            </div>
            <ComparisonArrow label={t("comparison.arrowLabel")} />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{t("comparison.recommendedLabel")}</p>
                  <h3 className="text-2xl font-semibold text-slate-900">{recommendedSnapshot?.title ?? "—"}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRoadmap((prev) => !prev)}
                  disabled={!roadmapReady}
                  className={`text-xs font-semibold uppercase tracking-[0.4em] ${
                    roadmapReady ? "text-purple-500" : "text-slate-400"
                  }`}
                >
                  {showRoadmap ? t("comparison.hideRoadmap") : t("comparison.seeRoadmap")}
                </button>
              </div>
              {showRoadmap ? (
                <RoadmapPanel
                  steps={analysis?.roadmap ?? []}
                  visible={showRoadmap}
                  label={t("advisor.roadmapLabel")}
                />
              ) : recommendedSnapshot ? (
                <SnapshotBlock snapshot={recommendedSnapshot} translate={t} />
              ) : (
                <p className="text-sm text-slate-500">{t("comparison.waiting")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
