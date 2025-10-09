"use client";

import Link from "next/link";
import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@workspace/ui/components/card";
import { Check, Loader2, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  getPaddleInstance,
  openCheckout,
  getPricePreview,
} from "@/lib/paddle/client";
import { Paddle } from "@paddle/paddle-js";
import { Progress } from "@workspace/ui/components/progress";
import { format } from "date-fns";

export default function SubscriptionPageClient() {
  const { data: session } = useSession();
  const {
    data: plans,
    isLoading: loadingPlans,
    error: plansError,
  } = trpc.subscription.getPlans.useQuery();

  const utils = trpc.useUtils();
  const { data: subscription, isLoading: loadingSub } =
    trpc.subscription.getCurrentSubscription.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });
  const { data: usage } = trpc.subscription.getUsageStats.useQuery(undefined, {
    enabled: true,
  });

  const createSubscriptionMutation =
    trpc.subscription.createSubscription.useMutation({
      onSuccess: async () => {
        toast.success("Subscribed to Free plan");
        await utils.subscription.getCurrentSubscription.invalidate();
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to subscribe");
      },
    });

  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [priceData, setPriceData] = useState<Record<string, any>>({});
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  // Initialize Paddle
  useEffect(() => {
    async function initPaddle() {
      try {
        const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
        const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as
          | "sandbox"
          | "production";

        if (!token) {
          console.error("Paddle client token not configured");
          return;
        }

        const paddleInstance = await getPaddleInstance({
          token,
          environment: environment || "sandbox",
          eventCallback: (event) => {
            if (event.name === "checkout.completed") {
              toast.success("Subscription activated! Redirecting...");
              setTimeout(() => {
                utils.subscription.getCurrentSubscription.invalidate();
                window.location.reload();
              }, 2000);
            }
            if (event.name === "checkout.closed") {
              setLoadingCheckout(null);
            }
          },
        });

        setPaddle(paddleInstance);
      } catch (error) {
        console.error("Failed to initialize Paddle:", error);
        toast.error("Payment system unavailable");
      }
    }

    initPaddle();
  }, [utils]);

  // Fetch price previews
  useEffect(() => {
    async function fetchPrices() {
      if (!paddle || !plans) return;

      for (const plan of plans) {
        if (plan.paddlePriceId && plan.price > 0) {
          try {
            const preview = await getPricePreview(paddle, {
              items: [{ priceId: plan.paddlePriceId, quantity: 1 }],
            });

            setPriceData((prev) => ({
              ...prev,
              [plan.id]: preview,
            }));
          } catch (error) {
            console.error(`Failed to fetch price for ${plan.name}:`, error);
          }
        }
      }
    }

    fetchPrices();
  }, [paddle, plans]);

  const handleSubscribe = async (plan: any) => {
    if (!session?.user) {
      toast.error("Please sign in to subscribe");
      return;
    }

    // Free plan
    if (plan.price === 0) {
      createSubscriptionMutation.mutate({ planId: plan.id });
      return;
    }

    // Paid plans
    if (!paddle) {
      toast.error("Payment system not ready. Please try again.");
      return;
    }

    if (!plan.paddlePriceId) {
      toast.error("Plan not configured properly");
      return;
    }

    try {
      setLoadingCheckout(plan.id);

      await openCheckout(paddle, {
        items: [{ priceId: plan.paddlePriceId, quantity: 1 }],
        customData: {
          userId: session.user.id,
          planId: plan.id,
        },
        customer: {
          email: session.user.email || undefined,
        },
        successUrl: `${window.location.origin}/account/auto-apply`,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
      setLoadingCheckout(null);
    }
  };

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

  const PlanCard = ({ plan }: { plan: any }) => {
    const features: string[] = [
      `${plan.maxJobListings} job listings`,
      `${plan.maxServiceListings} service listings`,
      `${plan.maxTaskListings} task listings`,
    ];

    if (plan.featuredListings) features.push("Featured listings");
    if (plan.prioritySupport) features.push("Priority support");
    if (plan.analyticsAccess) features.push("Analytics access");

    const isCurrent = subscription?.planId === plan.id;
    const isCheckingOut = loadingCheckout === plan.id;

    const paddlePrice = priceData[plan.id];
    const displayPrice =
      paddlePrice?.data?.details?.lineItems?.[0]?.formattedTotals?.total ||
      (plan.price > 0 ? `$${(plan.price / 100).toFixed(2)}` : "Free");

    const planKey = (
      plan.displayName ||
      plan.name ||
      "basic"
    ).toLowerCase() as PlanKey;
    const subtext = PLAN_SUBTEXT[planKey];

    return (
      <div
        className={`relative flex flex-col gap-6 overflow-hidden rounded-2xl border p-6 shadow transition-all duration-300 ${
          isCurrent
            ? "outline outline-[rgba(120,119,198,0.7)] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]"
            : "bg-white hover:shadow-lg"
        }`}
      >
        <div className="flex items-center justify-center gap-5">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <img
              src={PLAN_ICONS[planKey]}
              alt={`${plan.displayName || plan.name} icon`}
              width={64}
              height={64}
              className="h-14 w-14 object-contain"
            />
          </div>

          <h2 className="text-2xl font-semibold">
            {plan.displayName || plan.name}
          </h2>
        </div>

        <div className="relative">
          <div className="text-4xl font-semibold">
            {displayPrice}
            {plan.price > 0 && (
              <span className="text-base font-normal text-muted-foreground">
                /month
              </span>
            )}
          </div>
          {/* {paddlePrice && plan.price > 0 && (
            <div className="mt-1 text-sm text-muted-foreground">
              {
                paddlePrice.data?.details?.lineItems?.[0]?.formattedTotals
                  ?.subtotal
              }{" "}
              + tax
            </div>
          )}*/}
          <div className="mt-2 text-sm text-muted-foreground">{subtext}</div>
        </div>

        <div className="mt-4 mb-2 h-px w-full bg-gray-200" />

        <div className="flex-1">
          <ul className="space-y-2">
            {features.map((feature, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-sm text-foreground/80"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-black">
                  <Check size={10} strokeWidth={3} className="text-white" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <Button
          disabled={isCurrent || isCheckingOut}
          onClick={() => handleSubscribe(plan)}
          className={`w-full h-fit rounded-lg ${
            isCurrent
              ? "bg-[rgba(120,119,198,0.15)] text-foreground cursor-default"
              : "bg-black text-white hover:bg-black/90"
          }`}
        >
          {isCheckingOut ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Opening checkout...
            </>
          ) : isCurrent ? (
            "Current Plan"
          ) : plan.price > 0 ? (
            "Subscribe Now"
          ) : (
            "Get Started Free"
          )}
        </Button>
      </div>
    );
  };

  // ⬇️ This replaces your old bottom section
  const SubscriptionSummary = () => {
    if (!subscription) {
      return (
        <div className="text-center text-muted-foreground py-12">
          You don’t have an active subscription yet.
        </div>
      );
    }

    const isActive = subscription.status === "ACTIVE";

    const USAGE_ICONS = {
      jobs: "/images/jobs.png",
      services: "/images/services.png",
      tasks: "/images/tasks.png",
    };

    return (
      <div className="grid gap-6 md:grid-cols-2 mt-10">
        {/* Current Subscription Card */}
        <Card className="border border-gray-200 bg-white rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Current Plan
            </CardTitle>
            <CardDescription>Your active subscription details</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-base font-medium">
                Plan:{" "}
                <span className="font-semibold text-foreground">
                  {subscription.plan?.displayName || subscription.plan?.name}
                </span>
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                Status: {subscription.status.toLowerCase()}
              </p>
            </div>

            {subscription.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Next billing date:{" "}
                <span className="font-medium text-foreground">
                  {format(new Date(subscription.currentPeriodEnd), "PPP")}
                </span>
              </p>
            )}
            <hr className="my-2 border-t border-gray-200" />
          </CardContent>
          <CardFooter>
            <Button
              asChild
              className="w-full bg-black text-white hover:bg-black/90 rounded-lg"
            >
              <Link href="/account/billing">Manage Subscription</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Usage Card */}
        <Card className="border border-gray-200 bg-white rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Usage</CardTitle>
            <CardDescription>Track your plan limits</CardDescription>
          </CardHeader>

          <CardContent>
            {usage ? (
              <div className="space-y-5">
                {/* Jobs */}
                <div className="flex items-start gap-3">
                  <img
                    src={USAGE_ICONS.jobs}
                    alt="Jobs"
                    className="w-8 h-8 object-contain opacity-90"
                  />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-medium">
                      Jobs: {usage.jobListingsUsed}/
                      {usage.jobListingsLimit || "∞"}
                    </p>
                    <Progress
                      value={
                        usage?.jobListingsLimit
                          ? (usage.jobListingsUsed / usage.jobListingsLimit) *
                            100
                          : 0
                      }
                      className="h-2 bg-gray-200"
                    />
                    <p className="text-xs text-muted-foreground">
                      {usage?.jobListingsLimit != null
                        ? `${Math.max(
                            usage.jobListingsLimit - usage.jobListingsUsed,
                            0
                          )} remaining this month`
                        : "Unlimited"}
                    </p>
                  </div>
                </div>

                {/* Services */}
                <div className="flex items-start gap-3">
                  <img
                    src={USAGE_ICONS.services}
                    alt="Services"
                    className="w-8 h-8 object-contain opacity-90"
                  />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-medium">
                      Services: {usage.serviceListingsUsed}/
                      {usage.serviceListingsLimit || "∞"}
                    </p>
                    <Progress
                      value={
                        usage?.serviceListingsLimit
                          ? (usage.serviceListingsUsed /
                              usage.serviceListingsLimit) *
                            100
                          : 0
                      }
                      className="h-2 bg-gray-200"
                    />
                    <p className="text-xs text-muted-foreground">
                      {usage?.serviceListingsLimit != null
                        ? `${Math.max(
                            usage.serviceListingsLimit -
                              usage.serviceListingsUsed,
                            0
                          )} remaining this month`
                        : "Unlimited"}
                    </p>
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex items-start gap-3">
                  <img
                    src={USAGE_ICONS.tasks}
                    alt="Tasks"
                    className="w-8 h-8 object-contain opacity-90"
                  />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-medium">
                      Tasks: {usage.taskListingsUsed}/
                      {usage.taskListingsLimit || "∞"}
                    </p>
                    <Progress
                      value={
                        usage?.taskListingsLimit
                          ? (usage.taskListingsUsed / usage.taskListingsLimit) *
                            100
                          : 0
                      }
                      className="h-2 bg-gray-200"
                    />
                    <p className="text-xs text-muted-foreground">
                      {usage?.taskListingsLimit != null
                        ? `${Math.max(
                            usage.taskListingsLimit - usage.taskListingsUsed,
                            0
                          )} remaining this month`
                        : "Unlimited"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No usage data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold font-outfit">Choose your plan</h1>
        <p className="text-muted-foreground font-outfit">
          Upgrade to unlock more listings and features.
        </p>
      </div>

      {plansError && (
        <div className="text-sm text-red-500">
          Failed to load plans. Please refresh.
        </div>
      )}

      {!loadingPlans && plans && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans?.map((p: any) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}

      {/* New styled summary section */}
      <SubscriptionSummary />
    </div>
  );
}
