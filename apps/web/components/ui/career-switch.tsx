"use client";

import { useState } from "react";
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
import { Loader2, TrendingUp, Clock } from "lucide-react";

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

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatSalary = (range: { min: number; max: number }) => {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
    return `${formatter.format(range.min)} - ${formatter.format(range.max)}`;
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
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1.2fr]">
      <Card className="shadow-sm border-muted">
        <CardHeader>
          <CardTitle>{t("form.title")}</CardTitle>
          <CardDescription>{t("form.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="interests">{t("form.interests")}</Label>
            <Input
              id="interests"
              value={formData.interests}
              onChange={(e) => handleChange("interests", e.target.value)}
              placeholder={t("form.placeholders.interests")}
            />
          </div>

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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={handleGenerate}
            disabled={isAnalyzing}
            className="w-full bg-black text-white hover:bg-black/80"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("form.analyzing")}
              </>
            ) : (
              t("form.submit")
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {paths.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              {t("results.empty")}
            </CardContent>
          </Card>
        ) : (
          paths.map((path, index) => (
            <Card key={`${path.title}-${index}`} className="overflow-hidden shadow-sm">
              <CardHeader className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">{path.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t("results.rank", { index: index + 1 })}
                    </p>
                  </div>
                  <Badge className={difficultyStyles[path.difficulty].badge}>
                    {t(`difficulty.${path.difficulty}`)}
                  </Badge>
                </div>
                <CardDescription className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {path.timeToTransition}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <TrendingUp className="h-4 w-4" />
                    {t("results.salaryGrowth", {
                      growth: Math.round(
                        ((path.targetSalary.min - path.currentSalary.min) /
                          Math.max(path.currentSalary.min, 1)) *
                          100,
                      ),
                    })}
                  </span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-xs uppercase text-muted-foreground">
                      {t("results.currentSalary")}
                    </p>
                    <p className="text-lg font-semibold">
                      {formatSalary(path.currentSalary)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-50">
                    <p className="text-xs uppercase text-emerald-600">
                      {t("results.targetSalary")}
                    </p>
                    <p className="text-lg font-semibold text-emerald-700">
                      {formatSalary(path.targetSalary)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">{t("results.skills")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {path.requiredSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="border-primary text-primary"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">{t("results.stepsTitle")}</h4>
                  <div className="space-y-3">
                    {path.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black/10 text-sm font-semibold text-black">
                          {stepIndex + 1}
                        </div>
                        <p className="text-sm text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

