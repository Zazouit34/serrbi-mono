"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Check } from "lucide-react";

type PlanKey = "free" | "basic" | "premium";

const PLAN_ICONS: Record<PlanKey, string> = {
  free: "/images/free.png",
  basic: "/images/basic.png",
  premium: "/images/premium.png",
};

const PLAN_SUBTEXT: Record<PlanKey, string> = {
  free: "Best for individuals getting started.",
  basic: "Best for small teams and growing use.",
  premium: "Best for businesses that need more power.",
};

export function PricingShowcase() {
  const router = useRouter();
  const { data: plans, isLoading, error } = trpc.subscription.getPlans.useQuery();

  return (
    <section className="mx-auto my-18 w-full">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold md:text-3xl">Flexible plans</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">Choose a plan that fits your needs. Upgrade anytime.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/subscription")}>View all</Button>
      </div>

      {error && (
        <div className="text-sm text-red-500">Failed to load plans. Please try again.</div>
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
  const planKey = (plan.displayName || plan.name || "basic").toLowerCase() as PlanKey;
  const subtext = PLAN_SUBTEXT[planKey];
  const badgeLabel = planKey === "premium" ? "Best plan" : planKey === "basic" ? "Most value" : "Get started";

  const features: string[] = [
    `${plan.maxJobListings} job listings`,
    `${plan.maxServiceListings} service listings`,
    `${plan.maxTaskListings} task listings`,
  ];
  if (plan.featuredListings) features.push("Featured listings");
  if (plan.prioritySupport) features.push("Priority support");
  if (plan.analyticsAccess) features.push("Analytics access");

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
          <Button className="w-full rounded-lg bg-black text-white hover:bg-black/90">Choose plan</Button>
        </div>
      </Card>
    </div>
  );
}

export default PricingShowcase;


