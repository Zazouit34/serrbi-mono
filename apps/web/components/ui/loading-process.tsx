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
      <div className="relative w-full max-w-[520px] mx-auto px-2 sm:px-6">
        {clampedStep >= 0 && clampedStep < loadingSteps.length && (
          <div
            className="absolute left-11 h-px bg-[#e5e7eb] transition-all duration-500"
            style={{
              top: `${clampedStep * 56 + 28}px`,
              width: "calc(100% - 44px)",
            }}
          />
        )}

        <div className="py-6 space-y-6">
          {loadingSteps.map((label, index) => {
            const isDone = index < clampedStep;
            const isActive = index === clampedStep;

            return (
              <div key={label} className="flex items-center gap-3 h-[40px]">
                {isDone ? (
                  <DoneIcon />
                ) : isActive ? (
                  <ActiveIcon />
                ) : (
                  <PendingIcon />
                )}
                <span className="text-[18px] font-medium text-[#1f2937]">{label}</span>
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
    <div className="w-7 h-7 rounded-lg bg-[#7c3aed] flex items-center justify-center">
      <Check />
    </div>
  );
}

function ActiveIcon() {
  return (
    <div className="w-7 h-7 rounded-lg bg-[#ede9fe] flex items-center justify-center animate-pulse">
      <Check stroke="#7c3aed" />
    </div>
  );
}

function PendingIcon() {
  return (
    <div className="w-7 h-7 rounded-lg border border-[#c4b5fd] flex items-center justify-center">
      <Check stroke="#a78bfa" />
    </div>
  );
}

function Check({ stroke = "white" }: { stroke?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 13l4 4L19 7"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default LoadingProcess;

