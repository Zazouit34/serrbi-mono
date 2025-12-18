"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";

type FormState = {
  currentRole: string;
  currentSkills: string;
  interests: string;
  targetIndustry: string;
  timeframe: string;
  budget: string;
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

const initialForm: FormState = {
  currentRole: "",
  currentSkills: "",
  interests: "",
  targetIndustry: "",
  timeframe: "",
  budget: "",
};

type StepId = "currentRole" | "currentSkills" | "interests" | "targetIndustry" | "timeframe" | "budget";
type Step = {
  id: StepId;
  title: string;
  subtitle?: string;
  placeholder?: string;
  optional?: boolean;
};

function buildAdvisorMessage(analysis: CareerAnalysis | null) {
  if (!analysis?.recommendedSnapshot) return "";
  const recommended = analysis.recommendedSnapshot;
  const skillsCopy = recommended.skills.slice(0, 3).join(", ") || "new skills";
  const currentIndustry = analysis.currentSnapshot.industry?.toLowerCase?.() || "your background";
  const nextIndustry = recommended.industry?.toLowerCase?.() || "what's next";
  return `${recommended.title} extends your ${currentIndustry} toward ${nextIndustry} with ${skillsCopy}.`;
}

function flattenSkills(skills: string[]) {
  return skills.length ? skills : ["—"];
}

export function CareerSwitchPlanner() {
  const t = useTranslations("CareerSwitchFlow");
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [analysis, setAnalysis] = useState<CareerAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [strengthInput, setStrengthInput] = useState("");
  const [strengthTags, setStrengthTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>([]);
  const [showStepContent, setShowStepContent] = useState(true);

  const directionOptions = useMemo(
    () => [
      { value: "product", label: t("steps.targetIndustry.options.product") },
      { value: "leadership", label: t("steps.targetIndustry.options.leadership") },
      { value: "research", label: t("steps.targetIndustry.options.research") },
      { value: "design", label: t("steps.targetIndustry.options.design") },
      { value: "business", label: t("steps.targetIndustry.options.business") },
      { value: "open", label: t("steps.targetIndustry.options.open") },
    ],
    [t],
  );

  const timeframeOptions = useMemo(
    () => [
      { value: "3-6", label: t("steps.timeframe.options.3-6") },
      { value: "6-12", label: t("steps.timeframe.options.6-12") },
      { value: "1-2", label: t("steps.timeframe.options.1-2") },
      { value: "flexible", label: t("steps.timeframe.options.flexible") },
    ],
    [t],
  );

  const budgetOptions = useMemo(
    () => [
      { value: "minimal", label: t("steps.budget.options.minimal") },
      { value: "some", label: t("steps.budget.options.some") },
      { value: "significant", label: t("steps.budget.options.significant") },
      { value: "not-sure", label: t("steps.budget.options.not-sure") },
    ],
    [t],
  );

  const steps = useMemo<Step[]>(
    () => [
      {
        id: "currentRole",
        title: t("steps.currentRole.title"),
        placeholder: t("steps.currentRole.placeholder"),
      },
      {
        id: "currentSkills",
        title: t("steps.currentSkills.title"),
        placeholder: t("steps.currentSkills.placeholder"),
      },
      {
        id: "interests",
        title: t("steps.interests.title"),
        placeholder: t("steps.interests.placeholder"),
      },
      {
        id: "targetIndustry",
        title: t("steps.targetIndustry.title"),
        subtitle: t("steps.targetIndustry.subtitle"),
        optional: true,
      },
      {
        id: "timeframe",
        title: t("steps.timeframe.title"),
      },
      {
        id: "budget",
        title: t("steps.budget.title"),
        subtitle: t("steps.budget.subtitle"),
      },
    ],
    [t],
  );

  const advisorSummary = useMemo(() => buildAdvisorMessage(analysis), [analysis]);
  const currentStep = (steps[stepIndex] ?? steps[steps.length - 1]) as Step;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!showStepContent) return;
    inputRefs.current[stepIndex]?.focus({ preventScroll: true });
  }, [stepIndex, showStepContent]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, currentSkills: strengthTags.join(", ") }));
  }, [strengthTags]);

  const focusFirstField = () => {
    requestAnimationFrame(() => {
      inputRefs.current[0]?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    focusFirstField();
  }, []);

  const addStrengthFromInput = () => {
    const cleaned = strengthInput.trim();
    if (!cleaned) return;
    setStrengthTags((prev) => Array.from(new Set([...prev, cleaned])));
    setStrengthInput("");
  };

  const removeStrength = (tag: string) => {
    setStrengthTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleStrengthKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addStrengthFromInput();
    }
    if (event.key === "Backspace" && !strengthInput && strengthTags.length) {
      event.preventDefault();
      setStrengthTags((prev) => prev.slice(0, -1));
    }
  };

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const clampStep = (next: number) => Math.min(Math.max(next, 0), steps.length - 1);
  const transitionDelay = 180;

  const changeStep = (direction: 1 | -1) => {
    setShowStepContent(false);
    setTimeout(() => {
      setStepIndex((prev) => clampStep(prev + direction));
      requestAnimationFrame(() => setShowStepContent(true));
    }, transitionDelay);
  };

  const goNext = () => {
    if (isLastStep) {
      void handleGenerate();
      return;
    }
    changeStep(1);
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    changeStep(-1);
  };

  const handleGenerate = async () => {
    setError(null);
    setAnalysis(null);

    const pendingSkills = strengthInput.trim();
    let skillsForSend = strengthTags;
    if (pendingSkills) {
      const merged = Array.from(new Set([...strengthTags, pendingSkills]));
      skillsForSend = merged;
      setStrengthTags(merged);
      setStrengthInput("");
    }

    if (!formData.currentRole.trim() || !formData.interests.trim()) {
      setStepIndex(0);
      toast.error(t("errors.required"));
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "careerSwitch",
          payload: {
            ...formData,
            currentSkills: skillsForSend.join(", "),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      if (!data.currentSnapshot || !data.recommendedSnapshot) {
        throw new Error("The response was incomplete. Please try again.");
      }

      const nextAnalysis: CareerAnalysis = {
        insight: data.insight,
        currentSnapshot: data.currentSnapshot,
        recommendedSnapshot: data.recommendedSnapshot,
        roadmap: Array.isArray(data.roadmap) ? data.roadmap : [],
      };

      setAnalysis(nextAnalysis);
      toast.success("Path generated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderInput = (step: Step) => {
    switch (step.id) {
      case "currentRole":
        return (
          <input
            ref={(node) => {
              inputRefs.current[0] = node;
            }}
            value={formData.currentRole}
            onChange={(event) => handleFieldChange("currentRole", event.target.value)}
            placeholder={step.placeholder}
            className="pb-3 w-full text-2xl font-medium text-white bg-transparent border-b transition placeholder:text-white/50 focus:outline-none border-white/10 focus:border-white/40"
          />
        );
      case "currentSkills":
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {strengthTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeStrength(tag)}
                  className="px-4 py-2 text-sm font-medium rounded-full transition bg-white/10 text-white/90 hover:bg-white/20"
                >
                  {tag}
                </button>
              ))}
            </div>
            <input
              ref={(node) => {
                inputRefs.current[1] = node;
              }}
              value={strengthInput}
              onChange={(event) => setStrengthInput(event.target.value)}
              onBlur={addStrengthFromInput}
              onKeyDown={handleStrengthKeyDown}
              placeholder={step.placeholder}
              className="pb-3 w-full text-2xl font-medium text-white bg-transparent border-b transition placeholder:text-white/50 focus:outline-none border-white/10 focus:border-white/40"
            />
            <p className="text-sm text-white/60">{t("steps.currentSkills.helper")}</p>
          </div>
        );
      case "interests":
        return (
          <textarea
            ref={(node) => {
              inputRefs.current[2] = node;
            }}
            value={formData.interests}
            onChange={(event) => handleFieldChange("interests", event.target.value)}
            placeholder={step.placeholder}
            rows={3}
            className="pb-3 w-full text-2xl font-medium text-white bg-transparent border-b transition resize-none placeholder:text-white/50 focus:outline-none border-white/10 focus:border-white/40"
          />
        );
      case "targetIndustry":
        return (
          <div className="flex flex-wrap gap-3">
            {directionOptions.map((option) => {
              const isActive = formData.targetIndustry === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleFieldChange("targetIndustry", option.value)}
                  className={`rounded-full px-5 py-2 text-sm transition ${
                    isActive ? "bg-white text-slate-900" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleFieldChange("targetIndustry", "")}
              className="text-sm underline text-white/60 underline-offset-4"
            >
              {t("labels.skip")}
            </button>
          </div>
        );
      case "timeframe":
        return (
          <div className="flex flex-wrap gap-3">
            {timeframeOptions.map((option) => {
              const isActive = formData.timeframe === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleFieldChange("timeframe", option.value)}
                  className={`rounded-full px-5 py-3 text-base transition ${
                    isActive ? "bg-white text-slate-900" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      case "budget":
        return (
          <div className="flex flex-wrap gap-3">
            {budgetOptions.map((option) => {
              const isActive = formData.budget === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleFieldChange("budget", option.value)}
                  className={`rounded-full px-5 py-3 text-base transition ${
                    isActive ? "bg-white text-slate-900" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="isolate overflow-hidden relative px-6 py-12 min-h-screen text-white bg-gradient-to-b rounded-3xl shadow-2xl from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-[80vh] max-w-4xl flex-col justify-center gap-10">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            {steps.map((_, index) => (
              <span
                key={_.id}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index <= stepIndex ? "w-10 bg-white" : "w-7 bg-white/25"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-3 items-center">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="text-sm font-medium text-white/70 underline-offset-4 hover:text-white"
              >
                {t("nav.back")}
              </button>
            )}
            {!isLastStep ? (
              <button
                type="button"
                onClick={goNext}
                className="text-sm font-semibold text-white underline-offset-4 hover:text-white"
              >
                {t("nav.next")}
              </button>
            ) : (
              <Button
                type="button"
                onClick={goNext}
                disabled={isAnalyzing}
                className="text-white bg-gradient-to-r from-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/25 hover:from-purple-600 hover:to-fuchsia-600"
              >
                {t("nav.finalCta")}
              </Button>
            )}
          </div>
        </div>

        <div
          className={`transition-all duration-300 ease-out ${
            showStepContent && !isAnalyzing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
          }`}
          key={currentStep.id}
        >
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">{t("labels.progress")}</p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">{currentStep.title}</h2>
          {currentStep.subtitle && <p className="mt-2 text-lg text-white/60">{currentStep.subtitle}</p>}
          <div className="mt-10">{renderInput(currentStep)}</div>
        </div>

        {isAnalyzing && (
          <div className="space-y-3 text-center transition-all duration-300 ease-out">
            <p className="text-lg font-semibold text-white">{t("loading.title")}</p>
            <p className="text-base text-white/70">{t("loading.copy")}</p>
          </div>
        )}

        {error && (
          <div className="text-sm text-center text-red-300">
            {error}
          </div>
        )}

        {analysis && !isAnalyzing && (
          <div className="p-8 space-y-6 rounded-3xl backdrop-blur bg-white/5">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">{t("results.title")}</p>
            <div className="space-y-3">
              <h3 className="text-3xl font-semibold text-white">{analysis.recommendedSnapshot.title}</h3>
              <p className="text-base text-white/70">{advisorSummary || analysis.insight}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {flattenSkills(analysis.recommendedSnapshot.skills).map((skill, idx) => (
                <span key={`${skill}-${idx}`} className="px-3 py-1 text-sm rounded-full bg-white/10 text-white/80">
                  {skill}
                </span>
              ))}
            </div>
            {analysis.roadmap?.length ? (
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.2em] text-white/50">{t("results.roadmapLabel")}</p>
                <div className="space-y-4">
                  {analysis.roadmap.map((step) => (
                    <div key={step.title} className="p-4 rounded-2xl bg-white/5">
                      <p className="text-base font-semibold text-white">{step.title}</p>
                      <p className="text-sm text-white/70">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
