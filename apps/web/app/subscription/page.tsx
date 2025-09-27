"use client";

import Link from "next/link";
import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Check } from "lucide-react";
import { paddleClient } from "@/lib/paddle-client";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const { data: plans, isLoading: loadingPlans, error: plansError } = trpc.subscription.getPlans.useQuery();
  const { data: tokenData } = trpc.subscription.getPaddleClientToken.useQuery();
  const utils = trpc.useUtils();

  const { data: subscription, isLoading: loadingSub } = trpc.subscription.getCurrentSubscription.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: usage } = trpc.subscription.getUsageStats.useQuery(undefined, {
    enabled: true,
  });

  const createSubscription = trpc.subscription.createSubscription.useMutation({
    onSuccess: async () => {
      toast.success("Subscription created");
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to subscribe"),
  });

  const handleSubscribe = async (plan: any) => {
    try {
      if (!tokenData?.token) {
        toast.error("Missing Paddle client token");
        return;
      }

      // Check if we're using the development fallback token
      if (tokenData.token === 'test_client_token_for_development') {
        toast.error("Please configure your Paddle credentials in .env.local");
        return;
      }

      await paddleClient.initialize({
        token: tokenData.token,
        environment: (tokenData.environment as any) || "sandbox",
        pwCustomer: session?.user?.email ? { email: session.user.email } : undefined,
        eventCallback: (evt) => {
          if (evt.name === "checkout.completed") {
            toast.success("Checkout completed");
          }
        },
      });

      await paddleClient.openCheckout({
        items: [{ priceId: plan.paddlePriceId }],
        customer: session?.user?.email ? { email: session.user.email } : undefined,
        customData: { userId: (session as any)?.user?.id },
        successUrl: window.location.href,
      });

      // Also create a corresponding subscription record with selected plan
      createSubscription.mutate({ planId: plan.id, paddlePriceId: plan.paddlePriceId });
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
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
    const isPremium = String(plan.displayName || plan.name).toLowerCase().includes("auto apply")
      || String(plan.name).toLowerCase().includes("premium");

    return (
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{plan.displayName || plan.name}</CardTitle>
            {plan.isPopular ? <Badge>Popular</Badge> : null}
          </div>
          <div className="mt-2 text-3xl font-bold">
            {plan.price > 0 ? `$${(plan.price / 100).toFixed(2)}/mo` : "Free"}
          </div>
        </CardHeader>
        <CardContent className="transition-colors duration-200 hover:bg-muted/30 flex flex-col flex-1">
          <ul className="space-y-2 mb-4 flex-1">
            {features.map((f, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            <Button
              disabled={isCurrent || (!plan.paddlePriceId && plan.price > 0)}
              className="w-full transition-all duration-200 hover:shadow-md"
              onClick={() => handleSubscribe(plan)}
            >
              {isCurrent ? "Current Plan" : 
               !plan.paddlePriceId && plan.price > 0 ? "Setup Required" : 
               plan.price > 0 ? "Subscribe" : "Choose Free"}
            </Button>
            {!plan.paddlePriceId && plan.price > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Paddle price ID not configured
              </p>
            )}
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
          <Link href="/account/billing" className="text-[#FF040E] hover:underline">Manage billing</Link>
        </div>
        {plans && plans.some((p: any) => p.price > 0 && !p.paddlePriceId) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800">Setup Required</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Some paid plans need Paddle price IDs configured. Check the{" "}
              <Link href="/PADDLE_INTEGRATION.md" className="underline">
                setup guide
              </Link>{" "}
              for instructions.
            </p>
          </div>
        )}
        
        {tokenData?.token === 'test_client_token_for_development' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800">Paddle Setup Required</h3>
            <p className="text-sm text-blue-700 mt-1">
              To enable paid subscriptions, please configure your Paddle credentials:
            </p>
            <ol className="text-sm text-blue-700 mt-2 list-decimal list-inside space-y-1">
              <li>Go to <a href="https://vendors.paddle.com/" target="_blank" rel="noopener noreferrer" className="underline">Paddle Dashboard</a></li>
              <li>Get your API key and client token from Developer Tools → Authentication</li>
              <li>Update the .env.local file with your credentials</li>
              <li>Restart your development server</li>
            </ol>
          </div>
        )}
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
                <div>Plan: <span className="font-medium">{subscription.plan?.displayName || subscription.plan?.name}</span></div>
                <div>Status: <span className="font-medium">{subscription.status}</span></div>
                <div>Period: {subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : "-"} - {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "-"}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">You are currently on the Free plan.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {usage ? (
              <ul className="text-sm space-y-1">
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


