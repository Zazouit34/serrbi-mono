"use client";

import React from "react";
import { cn } from "@workspace/ui/lib/utils";

export const loadingSteps = [
  "Parsing your resume",
  "Analyzing your experience",
  "Extracting your skills",
  "Generating recommendations",
];

type LoadingProcessProps = {
  currentStep?: number; // 0-based
  className?: string;
};

export function LoadingProcess({ currentStep = 0, className }: LoadingProcessProps) {
  const clampedStep = Math.max(-1, Math.min(currentStep, loadingSteps.length - 1));

  return (
    <div className={cn("w-full", className)}>
      <div className="relative w-full max-w-[620px] mx-auto px-3 sm:px-8">
        <div className="py-7 space-y-7">
          {loadingSteps.map((label, index) => {
            const isDone = index < clampedStep;
            const isActive = index === clampedStep;

            return (
              <div key={label} className="flex items-center gap-4 h-[48px]">
                {isDone ? <DoneIcon /> : isActive ? <ActiveIcon /> : <PendingIcon />}
                <span className="text-[20px] font-medium text-[#111827]">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DoneIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center">
      <Check />
    </div>
  );
}

function ActiveIcon() {
  return (
    <div
      className="w-8 h-8 rounded-lg bg-[#ede9fe] flex items-center justify-center"
      style={{ animation: "spin 1.6s linear infinite" }}
    >
      <Check stroke="#7c3aed" />
    </div>
  );
}

function PendingIcon() {
  return (
    <div className="w-8 h-8 rounded-lg border border-[#c4b5fd] flex items-center justify-center opacity-70">
      <Check stroke="#a78bfa" />
    </div>
  );
}

function Check({ stroke = "white" }: { stroke?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 13l4 4L19 7"
        stroke={stroke}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default LoadingProcess;

