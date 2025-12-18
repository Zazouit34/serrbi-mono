"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { CareerSwitchPlanner } from "@/components/ui/career-switch";

type Props = {
  title: string;
  subtitle: string;
  startLabel: string;
};

export function CareerSwitchExperience({ title, subtitle, startLabel }: Props) {
  const [started, setStarted] = useState(false);

  const scrollToPlanner = () => {
    const target = document.getElementById("career-planner");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleStart = () => {
    setStarted(true);
    requestAnimationFrame(scrollToPlanner);
  };

  useEffect(() => {
    if (started) {
      scrollToPlanner();
    }
  }, [started]);

  return (
    <div className="flex flex-col">
      <section className="isolate overflow-hidden relative">
        <Image
          src="/images/career-switch.png"
          alt={title}
          fill
          priority
          className="object-contain absolute inset-0 w-[120%] h-[120%]"
          sizes="100vw"
        />

        <div className="flex relative flex-col gap-6 items-center px-6 py-24 mx-auto max-w-5xl text-center md:gap-7 md:py-28 lg:py-32">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl md:leading-tight lg:text-6xl">
            {title}
          </h1>
          <p className="text-base leading-relaxed md:text-lg md:leading-relaxed lg:max-w-3xl">
            {subtitle}
          </p>
          <Button
            onClick={handleStart}
            variant="ghost"
            className="inline-flex items-center font-bold text-gray-900 underline decoration-2 underline-offset-4 transition hover:text-gray-700 dark:text-gray-100"
          >
            {startLabel}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      <div
        id="career-planner"
        className={`transition-all duration-700 ease-out ${
          started
            ? "opacity-100 translate-y-0 py-12 md:py-16"
            : "pointer-events-none -translate-y-6 opacity-0"
        }`}
      >
        {started && (
          <div className="px-6">
            <CareerSwitchPlanner />
          </div>
        )}
      </div>
    </div>
  );
}
