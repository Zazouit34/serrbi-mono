"use client";

import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { toast } from "sonner";
import { useState } from "react";
import { PaymentStatus } from "@workspace/db";
import { Loader2 } from "lucide-react";

export default function BillingPage() {
  const utils = trpc.useUtils();
  const { data: sub } = trpc.subscription.getCurrentSubscription.useQuery();
  const [paymentHistoryPage, setPaymentHistoryPage] = useState(0);
  
  const { data: paymentHistory, isLoading: loadingPayments } = trpc.subscription.getPaymentHistory.useQuery({
    limit: 10,
    offset: paymentHistoryPage * 10,
  });

  const cancel = trpc.subscription.cancelSubscription.useMutation({
    onSuccess: async () => {
      toast.success("Subscription will be canceled at the end of the billing period");
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const pause = trpc.subscription.pauseSubscription.useMutation({
    onSuccess: async () => {
      toast.success("Subscription will be paused at the end of the billing period");
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resume = trpc.subscription.resumeSubscription.useMutation({
    onSuccess: async () => {
      toast.success("Subscription resumed successfully");
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.SUCCEEDED:
        return <Badge variant="default" className="bg-green-500">Paid</Badge>;
      case PaymentStatus.FAILED:
        return <Badge variant="destructive">Failed</Badge>;
      case PaymentStatus.REFUNDED:
        return <Badge variant="secondary">Refunded</Badge>;
      case PaymentStatus.PENDING:
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  const getSubscriptionStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      ACTIVE: { variant: 'default', label: 'Active' },
      CANCELED: { variant: 'destructive', label: 'Canceled' },
      PAUSED: { variant: 'secondary', label: 'Paused' },
      PAST_DUE: { variant: 'destructive', label: 'Past Due' },
      TRIALING: { variant: 'outline', label: 'Trial' },
    };

    const statusInfo = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and view payment history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {sub ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-2xl font-semibold">{sub.plan.displayName || sub.plan.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getSubscriptionStatusBadge(sub.status)}
                  </div>
                  {sub.plan.price > 0 && (
                    <div className="text-lg font-medium">
                      ${(sub.plan.price / 100).toFixed(2)}/month
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {sub.status === "PAUSED" ? (
                    <Button 
                      onClick={() => resume.mutate()} 
                      disabled={resume.isPending}
                    >
                      {resume.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resuming...
                        </>
                      ) : (
                        'Resume Subscription'
                      )}
                    </Button>
                  ) : sub.status === "ACTIVE" && sub.plan.price > 0 ? (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => pause.mutate()}
                        disabled={pause.isPending}
                      >
                        {pause.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Pausing...
                          </>
                        ) : (
                          'Pause Subscription'
                        )}
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => cancel.mutate({ immediately: false })}
                        disabled={cancel.isPending}
                      >
                        {cancel.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Canceling...
                          </>
                        ) : (
                          'Cancel Subscription'
                        )}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Billing Period</div>
                  <div className="font-medium">
                    {sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : "-"} 
                    {" → "}
                    {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "-"}
                  </div>
                </div>
                {sub.paddleSubscriptionId && (
                  <div>
                    <div className="text-muted-foreground">Subscription ID</div>
                    <div className="font-mono text-xs">{sub.paddleSubscriptionId}</div>
                  </div>
                )}
              </div>

              {sub.canceledAt && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Your subscription will end on {new Date(sub.currentPeriodEnd || '').toLocaleDateString()}. 
                    You'll continue to have access until then.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">
              No active subscription. <a href="/subscription" className="text-primary hover:underline">Choose a plan</a> to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : paymentHistory?.payments && paymentHistory.payments.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">
                        {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 
                         payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.description || `${payment.subscription?.plan?.displayName || 'Subscription'} payment`}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatAmount(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {payment.paymentMethod?.replace('_', ' ') || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {paymentHistory.hasMore && (
                <div className="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setPaymentHistoryPage(prev => prev + 1)}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No payment history available yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          {sub?.plan ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{sub.plan.maxJobListings}</div>
                <div className="text-sm text-muted-foreground">Job Listings</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{sub.plan.maxServiceListings}</div>
                <div className="text-sm text-muted-foreground">Service Listings</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{sub.plan.maxTaskListings}</div>
                <div className="text-sm text-muted-foreground">Task Listings</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Subscribe to a plan to see your features.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}