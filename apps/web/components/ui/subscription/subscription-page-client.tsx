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

    return (
      <div
        className={`relative flex flex-col gap-6 overflow-hidden rounded-2xl border p-6 shadow transition-all duration-300 ${
          isCurrent
            ? "outline outline-[rgba(120,119,198,0.7)] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]"
            : "bg-white hover:shadow-lg"
        }`}
      >
        <h2 className="text-xl font-semibold">
          {plan.displayName || plan.name}
        </h2>

        <div className="relative h-12">
          <div className="text-4xl font-semibold">
            {displayPrice}
            {plan.price > 0 && (
              <span className="text-base font-normal text-muted-foreground">
                /month
              </span>
            )}
          </div>
          {paddlePrice && plan.price > 0 && (
            <div className="mt-1 text-sm text-muted-foreground">
              {
                paddlePrice.data?.details?.lineItems?.[0]?.formattedTotals
                  ?.subtotal
              }{" "}
              + tax
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {plan.description}
          </p>
          <ul className="space-y-2">
            {features.map((feature, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-sm text-foreground/70"
              >
                <Check strokeWidth={1.5} size={16} className="text-green-600" />
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

    return (
      <div className="grid gap-6 md:grid-cols-2 mt-10">
        {/* Current Subscription Card */}
        <Card
          className={`relative overflow-hidden border ${
            isActive
              ? "border-blue-500 bg-gradient-to-br from-blue-50 to-white"
              : "border-border bg-white"
          }`}
        >
          {isActive && (
            <div className="absolute top-0 right-0 p-3">
              <CheckCircle2 className="h-6 w-6 text-blue-500" />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Current Subscription
            </CardTitle>
            <CardDescription>Your active plan details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-base font-medium">
                Plan:{" "}
                <span className="font-semibold text-blue-600">
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
                <span className="font-medium">
                  {format(new Date(subscription.currentPeriodEnd), "PPP")}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card className="border border-border bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Usage</CardTitle>
            <CardDescription>Track your current plan limits</CardDescription>
          </CardHeader>
          <CardContent>
            {usage ? (
              <div className="space-y-5">
                {/* Jobs */}
                <div>
                  <p className="text-sm font-medium">
                    Jobs: {usage.jobListingsUsed}/
                    {usage.jobListingsLimit || "∞"}
                  </p>
                  <Progress
                    value={
                      usage?.jobListingsLimit
                        ? (usage.jobListingsUsed / usage.jobListingsLimit) * 100
                        : 0
                    }
                    className="h-2 bg-gray-200"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {usage?.jobListingsLimit != null
                      ? `${Math.max(usage.jobListingsLimit - usage.jobListingsUsed, 0)} remaining this month`
                      : "Unlimited"}
                  </p>
                </div>

                {/* Services */}
                <div>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {usage?.serviceListingsLimit != null
                      ? `${Math.max(usage.serviceListingsLimit - usage.serviceListingsUsed, 0)} remaining this month`
                      : "Unlimited"}
                  </p>
                </div>

                {/* Tasks */}
                <div>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {usage?.taskListingsLimit != null
                      ? `${Math.max(usage.taskListingsLimit - usage.taskListingsUsed, 0)} remaining this month`
                      : "Unlimited"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No usage data.
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
        <div className="mt-3 text-sm">
          <Link
            href="/account/billing"
            className="text-[#FF040E] hover:underline"
          >
            Manage billing
          </Link>
        </div>
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
