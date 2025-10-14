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
import { Check, Loader2 } from "lucide-react";
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
import { useTranslations } from "next-intl";

export default function SubscriptionPageClient() {
  const t = useTranslations();
  const tPricing = useTranslations("Pricing");
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
        toast.success(t("Subscription.toasts.subscribedFree"));
        await utils.subscription.getCurrentSubscription.invalidate();
      },
      onError: (error: any) => {
        toast.error(error.message || t("Subscription.toasts.checkoutFailed"));
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
                window.location.href = "/subscription/success";
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
        toast.error(t("Subscription.toasts.paymentUnavailable"));
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
      toast.error(t("Subscription.toasts.notSignedIn"));
      return;
    }

    // Free plan
    if (plan.price === 0) {
      createSubscriptionMutation.mutate({ planId: plan.id });
      return;
    }

    // Paid plans
    if (!paddle) {
      toast.error(t("Subscription.toasts.checkoutNotReady"));
      return;
    }

    if (!plan.paddlePriceId) {
      toast.error(t("Subscription.toasts.planMisconfigured"));
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
      toast.error(error.message || t("Subscription.toasts.checkoutFailed"));
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
    free: "planSubtext.free",
    basic: "planSubtext.basic",
    premium: "planSubtext.premium",
  };

  const PlanCard = ({ plan }: { plan: any }) => {
    const features: string[] = [
      `${plan.maxJobListings} ${tPricing("features.jobListings")}`,
      `${plan.maxServiceListings} ${tPricing("features.serviceListings")}`,
      `${plan.maxTaskListings} ${tPricing("features.taskListings")}`,
    ];

    if (plan.featuredListings) features.push(tPricing("features.featuredListings"));
    if (plan.prioritySupport) features.push(tPricing("features.prioritySupport"));
    if (plan.analyticsAccess) features.push(tPricing("features.analyticsAccess"));

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
    const subtext = tPricing(PLAN_SUBTEXT[planKey]);

    return (
      <div
        className={`relative flex flex-col gap-6 overflow-hidden rounded-2xl border p-6 shadow transition-all duration-300 ${
          isCurrent
            ? "outline outline-[rgba(120,119,198,0.7)] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]"
            : "bg-white hover:shadow-lg"
        }`}
      >
        <div className="flex gap-5 justify-center items-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
            <img
              src={PLAN_ICONS[planKey]}
              alt={`${plan.displayName || plan.name} icon`}
              width={64}
              height={64}
              className="object-contain w-14 h-14"
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
                {t("Subscription.price.perMonth")}
              </span>
            )}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{subtext}</div>
        </div>

        <div className="mt-4 mb-2 w-full h-px bg-gray-200" />

        <div className="flex-1">
          <ul className="space-y-2">
            {features.map((feature, idx) => (
              <li
                key={idx}
                className="flex gap-2 items-center text-sm text-foreground/80"
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
              {t("Subscription.cta.openingCheckout")}
            </>
          ) : isCurrent ? (
            t("Subscription.cta.currentPlan")
          ) : plan.price > 0 ? (
            t("Subscription.cta.subscribeNow")
          ) : (
            t("Subscription.cta.getStartedFree")
          )}
        </Button>
      </div>
    );
  };

  // ⬇️ This replaces your old bottom section
  const SubscriptionSummary = () => {
    if (!subscription) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          {t("Billing.noActive")}
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
      <div className="grid gap-6 mt-10 md:grid-cols-2">
        {/* Current Subscription Card */}
        <Card className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {t("Billing.currentPlan")}
            </CardTitle>
            <CardDescription>{t("Billing.subtitle")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-base font-medium">
                {t("Billing.labels.plan")}:{" "}
                <span className="font-semibold text-foreground">
                  {subscription.plan?.displayName || subscription.plan?.name}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {t("Billing.labels.status")}: {t(`Billing.statuses.${subscription.status}`)}
              </p>
            </div>

            {subscription.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                {t("Billing.labels.nextBillingDate")}:{" "}
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
              className="w-full text-white bg-black rounded-lg hover:bg-black/90"
            >
              <Link href="/account/billing">{t("SubscriptionSuccess.manageSubscription")}</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Usage Card */}
        <Card className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t("Billing.usage.title")}</CardTitle>
            <CardDescription>{t("Billing.usage.subtitle")}</CardDescription>
          </CardHeader>

          <CardContent>
            {usage ? (
              <div className="space-y-5">
                {/* Jobs */}
                <div className="flex gap-3 items-start">
                  <img
                    src={USAGE_ICONS.jobs}
                    alt="Jobs"
                    className="object-contain w-8 h-8 opacity-90"
                  />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-medium">
                      {t("Billing.usage.jobs")}: {usage.jobListingsUsed}/
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
                          )} ${t("Billing.remaining")}`
                        : t("Billing.unlimited")}
                    </p>
                  </div>
                </div>

                {/* Services */}
                <div className="flex gap-3 items-start">
                  <img
                    src={USAGE_ICONS.services}
                    alt="Services"
                    className="object-contain w-8 h-8 opacity-90"
                  />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-medium">
                      {t("Billing.usage.services")}: {usage.serviceListingsUsed}/
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
                          )} ${t("Billing.remaining")}`
                        : t("Billing.unlimited")}
                    </p>
                  </div>
                </div>

                {/* Tasks */}
                <div className="flex gap-3 items-start">
                  <img
                    src={USAGE_ICONS.tasks}
                    alt="Tasks"
                    className="object-contain w-8 h-8 opacity-90"
                  />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-sm font-medium">
                      {t("Billing.usage.tasks")}: {usage.taskListingsUsed}/
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
                          )} ${t("Billing.remaining")}`
                        : t("Billing.unlimited")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t("Billing.usage.noData")}</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold font-outfit">{t("Subscription.title")}</h1>
        <p className="text-muted-foreground font-outfit">{t("Subscription.subtitle")}</p>
      </div>

      {plansError && (
        <div className="text-sm text-red-500">
          {t("Subscription.errors.loadPlans")}
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
