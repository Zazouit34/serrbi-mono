"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import { Card } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

type PlanKey = "free" | "basic" | "premium";

const PLAN_ICONS: Record<PlanKey, string> = {
  free: "/images/free.png",
  basic: "/images/basic.png",
  premium: "/images/premium.png",
};

const PLAN_SUBTEXT: Record<PlanKey, string> = {
  free: "planSubtext.free",
  basic: "planSubtext.basic",
  premium: "planSubtext.premium",
};

export function PricingShowcase() {
  const router = useRouter();
  const { data: plans, isLoading, error } = trpc.subscription.getPlans.useQuery();
  const t = useTranslations("Pricing");

  return (
    <section className="mx-auto my-18 w-full">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold md:text-3xl">{t("title")}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/subscription")}>{t("viewAll")}</Button>
      </div>

      {error && (
        <div className="text-sm text-red-500">{t("errors.loadPlansFailed")}</div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 h-10 w-24 animate-pulse rounded bg-gray-200" />
              <div className="mt-6 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              </div>
            </Card>
          ))}

        {!isLoading && plans?.map((plan) => <PlanPreview key={plan.id} plan={plan} onClick={() => router.push(`/subscription`)} />)}
      </div>
    </section>
  );
}

function PlanPreview({ plan, onClick }: { plan: any; onClick: () => void }) {
  const t = useTranslations("Pricing");
  const planKey = (plan.displayName || plan.name || "basic").toLowerCase() as PlanKey;
  const subtext = t(PLAN_SUBTEXT[planKey]);
  const badgeLabel = planKey === "premium" ? t("badges.bestPlan") : planKey === "basic" ? t("badges.mostValue") : t("badges.getStarted");

  const features: string[] = [
    `${plan.maxJobListings} ${t("features.jobListings")}`,
    `${plan.maxServiceListings} ${t("features.serviceListings")}`,
    `${plan.maxTaskListings} ${t("features.taskListings")}`,
  ];
  if (plan.featuredListings) features.push(t("features.featuredListings"));
  if (plan.prioritySupport) features.push(t("features.prioritySupport"));
  if (plan.analyticsAccess) features.push(t("features.analyticsAccess"));

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="text-left cursor-pointer"
    >
      <Card className="relative flex h-full flex-col gap-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center justify-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <img src={PLAN_ICONS[planKey]} alt={`${plan.displayName || plan.name} icon`} width={64} height={64} className="h-14 w-14 object-contain" />
          </div>
          <h3 className="text-2xl font-semibold">{plan.displayName || plan.name}</h3>
        </div>

        <div>
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-foreground/90">
            {badgeLabel}
          </span>
          <div className="mt-2 text-sm text-muted-foreground">{subtext}</div>
        </div>

        <div className="mt-2 w-full border-t border-gray-200" />

        <ul className="space-y-2">
          {features.slice(0, 4).map((feature: string, idx: number) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-foreground/80">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-black"><Check size={10} strokeWidth={3} className="text-white" /></span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2">
          <Button className="w-full rounded-lg bg-black text-white hover:bg-black/90">{t("choosePlan")}</Button>
        </div>
      </Card>
    </div>
  );
}

export default PricingShowcase;


