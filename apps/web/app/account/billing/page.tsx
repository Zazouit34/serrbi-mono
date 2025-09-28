"use client";

import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { paddleClient } from "@/lib/paddle-client";
import { toast } from "sonner";
import { useState } from "react";
import { PaymentStatus } from "@workspace/db";

export default function BillingPage() {
  const utils = trpc.useUtils();
  const { data: sub } = trpc.subscription.getCurrentSubscription.useQuery();
  const tokenData = trpc.subscription.getPaddleClientToken.useQuery();
  const [paymentHistoryPage, setPaymentHistoryPage] = useState(0);
  
  const { data: paymentHistory, isLoading: loadingPayments } = trpc.subscription.getPaymentHistory.useQuery({
    limit: 10,
    offset: paymentHistoryPage * 10,
  });

  const { data: invoices, isLoading: loadingInvoices } = trpc.subscription.getInvoices.useQuery({
    limit: 10,
    offset: 0,
  });

  const { data: upcomingInvoice } = trpc.subscription.getUpcomingInvoice.useQuery();

  const { data: paymentMethods } = trpc.subscription.getPaymentMethods.useQuery();

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

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="text-sm text-muted-foreground">Loading payment history...</div>
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
                        {payment.description || 'Subscription payment'}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatAmount(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.paymentMethod || '-'}
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
            <div className="text-sm text-muted-foreground">No payment history found.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethods && paymentMethods.length > 0 ? (
            <div className="space-y-4">
              {paymentMethods.map((method: any) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                      {method.type === 'card' ? '💳' : '🏦'}
                    </div>
                    <div>
                      <div className="font-medium">
                        {method.type === 'card' ? 
                          `${method.card?.brand?.toUpperCase()} •••• ${method.card?.last4}` : 
                          method.type
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {method.type === 'card' && method.card?.expiryMonth && method.card?.expiryYear ? 
                          `Expires ${method.card.expiryMonth}/${method.card.expiryYear}` : 
                          'Payment method'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                    <Button variant="outline" size="sm">
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No payment methods found.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingInvoice && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Upcoming Invoice</h4>
              <p className="text-sm text-blue-700">
                Next billing date: {upcomingInvoice && 'dueDate' in upcomingInvoice && upcomingInvoice.dueDate ? new Date(upcomingInvoice.dueDate).toLocaleDateString() : 'N/A'}
              </p>
              <p className="text-sm text-blue-700">
                Amount: {upcomingInvoice && 'totals' in upcomingInvoice ? formatAmount(upcomingInvoice.totals?.grandTotal || 0, upcomingInvoice.currencyCode || 'USD') : 'N/A'}
              </p>
            </div>
          )}

          {loadingInvoices ? (
            <div className="text-sm text-muted-foreground">Loading invoices...</div>
          ) : invoices?.invoices && invoices.invoices.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.invoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-sm font-medium">
                        {invoice.invoiceNumber || invoice.id.slice(-8)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatAmount(invoice.totals?.grandTotal || 0, invoice.currencyCode || 'USD')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Open invoice download URL
                            window.open(invoice.downloadUrl, '_blank');
                          }}
                        >
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No invoices found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


