 "use client";

import { useEffect, useRef, useState } from "react";
import ResumeScoreCardSimple from "@/components/ui/resume-score-card-simple";
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
    const stepDuration = 1100;
    let step = 0;
    setTimeout(() => setCurrentStep(0), 150);

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
        }, 500);
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-8">
      <button
        onClick={start}
        className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
      >
        Start analysis
      </button>

      {showLoader && (
        <div className="w-full flex justify-center">
          <LoadingProcess currentStep={currentStep} />
        </div>
      )}

      {showResult && (
        <div className="w-full flex justify-center">
          <ResumeScoreCardSimple />
        </div>
      )}
    </div>
  );
}