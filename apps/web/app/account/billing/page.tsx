"use client";

import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { paddleClient } from "@/lib/paddle-client";
import { toast } from "sonner";

export default function BillingPage() {
  const utils = trpc.useUtils();
  const { data: sub } = trpc.subscription.getCurrentSubscription.useQuery();
  const tokenData = trpc.subscription.getPaddleClientToken.useQuery();

  const pause = trpc.subscription.pauseSubscription.useMutation({
    onSuccess: async () => {
      toast.success("Subscription paused");
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const resume = trpc.subscription.resumeSubscription.useMutation({
    onSuccess: async () => {
      toast.success("Subscription resumed");
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const cancel = trpc.subscription.cancelSubscription.useMutation({
    onSuccess: async () => {
      toast.success("Subscription canceled");
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePaymentMethodTx = trpc.subscription.getUpdatePaymentMethodTransaction.useQuery(undefined, {
    enabled: Boolean(sub?.paddleSubscriptionId),
  });

  const openUpdatePaymentMethod = async () => {
    try {
      if (!tokenData.data?.token) {
        toast.error("Missing Paddle client token");
        return;
      }

      await paddleClient.initialize({
        token: tokenData.data.token,
        environment: (tokenData.data.environment as any) || "sandbox",
      });

      const transactionId = updatePaymentMethodTx.data?.transactionId;
      if (!transactionId) {
        toast.error("No transaction available");
        return;
      }

      await paddleClient.updatePaymentMethod({
        subscriptionId: sub!.paddleSubscriptionId!,
        transactionId,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to open payment method update");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and payment methods.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {sub ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{sub.plan.displayName || sub.plan.name}</div>
                  <div className="text-sm text-muted-foreground">Status: {sub.status}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={openUpdatePaymentMethod}>Update payment method</Button>
                  {sub.status === "PAUSED" ? (
                    <Button onClick={() => resume.mutate()}>Resume</Button>
                  ) : (
                    <Button variant="outline" onClick={() => pause.mutate()}>Pause</Button>
                  )}
                  <Button variant="destructive" onClick={() => cancel.mutate({ immediately: false })}>Cancel</Button>
                </div>
              </div>
              <Separator />
              <div className="text-sm text-muted-foreground">
                Period: {sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : "-"} - {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "-"}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No active subscription</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


