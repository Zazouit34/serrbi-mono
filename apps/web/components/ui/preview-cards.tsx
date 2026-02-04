"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";

type PreviewType = "jobs" | "services" | "tasks";

interface PreviewCardsProps {
  title?: string;
  items: any[];
  type: PreviewType;
  isLoading?: boolean;
}

export function PreviewCards({ title, items, type, isLoading }: PreviewCardsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`rounded-3xl border border-gray-100/80 bg-white/70 p-4 md:p-6 shadow-sm transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      {title ? (
        <div className="mb-3 text-sm font-semibold text-gray-900">{title}</div>
      ) : null}
      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-gray-500">No items to show yet.</p>
      )}
      {!isLoading && items.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {items.slice(0, 12).map((item: any) => {
            if (type === "jobs") {
              return (
                <JobCard
                  key={item.id}
                  job={{
                    id: item.id,
                    title: item.title,
                    companyName: item.companyName ?? null,
                    companyImage: item.companyImage ?? null,
                    wage: item.wage ?? null,
                    stateAbbreviation: item.stateAbbreviation ?? null,
                    city: item.city ?? null,
                    type: item.type,
                    experienceLevel: item.experienceLevel,
                    locationRequirement: item.locationRequirement,
                    category: item.category,
                    user: null,
                    createdAt: item.createdAt,
                    description: item.description,
                    status: item.status,
                  }}
                  featured={false}
                  compact
                  className="h-full"
                />
              );
            }
            if (type === "services") {
              return (
                <Link
                  key={item.id}
                  href={`/services?serviceCategory=${encodeURIComponent(item.serviceCategory ?? "")}`}
                >
                  <ServiceCard service={item} compact className="h-full" />
                </Link>
              );
            }
            return (
              <TaskCard key={item.id} task={item} compact className="h-full" />
            );
          })}
        </div>
      )}
    </div>
  );
}
