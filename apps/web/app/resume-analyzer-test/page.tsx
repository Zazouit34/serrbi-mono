 "use client";

import { useEffect, useRef, useState } from "react";
import ResumeScoreCardSimple from "@/components/ui/resume-score-card-simple";
import ResumeInsightTest from "@/components/ui/resume-insight-test";
import LoadingProcess, { loadingSteps } from "@/components/ui/loading-process";

export default function ResumeAnalyzerTestPage() {
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [showLoader, setShowLoader] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setShowResult(false);
    setShowLoader(true);
    setCurrentStep(-1);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Kick off the sequence shortly after click
    const stepDuration = 1600;
    let step = 0;
    setTimeout(() => setCurrentStep(0), 250);

    intervalRef.current = setInterval(() => {
      step += 1;
      if (step >= loadingSteps.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setCurrentStep(loadingSteps.length - 1);
        setTimeout(() => {
          setShowLoader(false);
          setShowResult(true);
          setCurrentStep(-1);
        }, 700);
        return;
      }
      setCurrentStep(step);
    }, stepDuration);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen px-4 py-6 md:py-10">
      <div className="flex items-center justify-center mb-6">
        <button
          onClick={start}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          Start analysis
        </button>
      </div>

      {showLoader && !showResult && (
        <div className="w-full flex justify-center">
          <LoadingProcess currentStep={currentStep} />
        </div>
      )}

      {showResult && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 max-w-7xl mx-auto">
          <div className="lg:w-[32%] w-full lg:sticky lg:top-6 self-start">
            <ResumeScoreCardSimple />
          </div>
          <div className="lg:w-[68%] w-full">
            <ResumeInsightTest />
          </div>
        </div>
      )}
    </div>
  );
}