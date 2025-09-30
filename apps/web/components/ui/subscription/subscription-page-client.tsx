"use client";

import Link from "next/link";
import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Check, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { getPaddleInstance, openCheckout, getPricePreview } from "@/lib/paddle/client";
import { Paddle } from "@paddle/paddle-js";

export default function SubscriptionPageClient() {
  const { data: session } = useSession();
  const { data: plans, isLoading: loadingPlans, error: plansError } = trpc.subscription.getPlans.useQuery();
  const utils = trpc.useUtils();

  const { data: subscription, isLoading: loadingSub } = trpc.subscription.getCurrentSubscription.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: usage } = trpc.subscription.getUsageStats.useQuery(undefined, {
    enabled: true,
  });

  const createSubscriptionMutation = trpc.subscription.createSubscription.useMutation({
    onSuccess: async () => {
      toast.success('Subscribed to Free plan');
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to subscribe');
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
        const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production';

        if (!token) {
          console.error('Paddle client token not configured');
          return;
        }

        const paddleInstance = await getPaddleInstance({
          token,
          environment: environment || 'sandbox',
          eventCallback: (event) => {
            if (event.name === 'checkout.completed') {
              toast.success('Subscription activated! Redirecting...');
              setTimeout(() => {
                utils.subscription.getCurrentSubscription.invalidate();
                window.location.reload();
              }, 2000);
            }
            if (event.name === 'checkout.closed') {
              setLoadingCheckout(null);
            }
          },
        });

        setPaddle(paddleInstance);
      } catch (error) {
        console.error('Failed to initialize Paddle:', error);
        toast.error('Payment system unavailable');
      }
    }

    initPaddle();
  }, [utils]);

  // Fetch price previews for all paid plans
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
      toast.error('Please sign in to subscribe');
      return;
    }

    // Free plan - direct subscription
    if (plan.price === 0) {
      createSubscriptionMutation.mutate({ planId: plan.id });
      return;
    }

    // Paid plans - Paddle checkout
    if (!paddle) {
      toast.error('Payment system not ready. Please try again.');
      return;
    }

    if (!plan.paddlePriceId) {
      toast.error('Plan not configured properly');
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
        successUrl: `${window.location.origin}/subscription?success=true`,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to start checkout');
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
    
    // Get localized price from Paddle
    const paddlePrice = priceData[plan.id];
    const displayPrice = paddlePrice?.data?.details?.lineItems?.[0]?.formattedTotals?.total || 
                         (plan.price > 0 ? `$${(plan.price / 100).toFixed(2)}` : 'Free');

    return (
      <Card className={`h-full transition-all duration-200 hover:shadow-lg ${plan.isPopular ? 'border-primary' : ''} flex flex-col`}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">{plan.displayName || plan.name}</CardTitle>
            {plan.isPopular && <Badge variant="default">Popular</Badge>}
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold">
              {displayPrice}
              {plan.price > 0 && <span className="text-base font-normal text-muted-foreground">/month</span>}
            </div>
            {paddlePrice && plan.price > 0 && (
              <div className="mt-1 text-sm text-muted-foreground">
                {paddlePrice.data?.details?.lineItems?.[0]?.formattedTotals?.subtotal} + tax
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1">
          <ul className="flex-1 mb-4 space-y-2">
            {features.map((f, idx) => (
              <li key={idx} className="flex gap-2 items-center text-sm text-muted-foreground">
                <Check className="flex-shrink-0 w-4 h-4 text-green-500" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            <Button
              disabled={isCurrent || isCheckingOut}
              className="w-full transition-all duration-200 hover:shadow-md"
              onClick={() => handleSubscribe(plan)}
              variant={plan.isPopular ? "default" : "outline"}
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
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Choose your plan</h1>
        <p className="text-muted-foreground">Upgrade to unlock more listings and features.</p>
        <div className="mt-3 text-sm">
          <Link href="/account/billing" className="text-[#FF040E] hover:underline">
            Manage billing
          </Link>
        </div>
      </div>

      {(loadingPlans || loadingSub) && <div>Loading plans...</div>}
      {plansError && (
        <div className="text-sm text-red-500">Failed to load plans. Please refresh.</div>
      )}
      {!loadingPlans && plans && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans?.map((p: any) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-1 text-sm">
                <div>
                  Plan: <span className="font-medium">{subscription.plan?.displayName || subscription.plan?.name}</span>
                </div>
                <div>
                  Status: <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>{subscription.status}</Badge>
                </div>
                <div>
                  Period: {subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : "-"} - {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "-"}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No active subscription. Start with our Free plan!</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {usage ? (
              <ul className="space-y-1 text-sm">
                <li>Jobs: {usage.jobListingsUsed}/{usage.jobListingsLimit || "∞"}</li>
                <li>Services: {usage.serviceListingsUsed}/{usage.serviceListingsLimit || "∞"}</li>
                <li>Tasks: {usage.taskListingsUsed}/{usage.taskListingsLimit || "∞"}</li>
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">No usage data.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


