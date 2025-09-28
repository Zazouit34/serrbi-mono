"use client";

import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { PaymentStatus } from "@workspace/db";

export default function AdminPaymentsPage() {
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");

  const utils = trpc.useUtils();
  
  const { data: payments, isLoading } = trpc.subscription.getAllSubscriptions.useQuery({
    limit: 50,
    offset: 0,
  });

  const createRefund = trpc.subscription.createRefund.useMutation({
    onSuccess: () => {
      toast.success("Refund created successfully");
      setRefundDialogOpen(false);
      setSelectedPayment(null);
      setRefundAmount("");
      setRefundReason("");
      utils.subscription.getAllSubscriptions.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleRefund = () => {
    if (!selectedPayment) return;

    createRefund.mutate({
      paymentId: selectedPayment.id,
      amount: refundAmount ? parseFloat(refundAmount) * 100 : undefined, // Convert to cents
      reason: refundReason || undefined,
    });
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

  // Flatten payments from all subscriptions
  const allPayments = payments?.subscriptions?.flatMap((sub: any) => sub.payments) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">Manage payments and process refunds.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading payments...</div>
          ) : allPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm font-mono">
                      {payment.id.slice(-8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.user?.email || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatAmount(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 
                       payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.description || 'Subscription payment'}
                    </TableCell>
                    <TableCell>
                      {payment.status === PaymentStatus.SUCCEEDED && (
                        <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedPayment(payment)}
                            >
                              Refund
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Refund</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Payment</Label>
                                <div className="text-sm text-muted-foreground">
                                  {formatAmount(payment.amount, payment.currency)} - {payment.description}
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="refundAmount">Refund Amount (optional)</Label>
                                <Input
                                  id="refundAmount"
                                  type="number"
                                  step="0.01"
                                  placeholder="Leave empty for full refund"
                                  value={refundAmount}
                                  onChange={(e) => setRefundAmount(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="refundReason">Reason (optional)</Label>
                                <Textarea
                                  id="refundReason"
                                  placeholder="Reason for refund"
                                  value={refundReason}
                                  onChange={(e) => setRefundReason(e.target.value)}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setRefundDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={handleRefund}
                                  disabled={createRefund.isPending}
                                >
                                  {createRefund.isPending ? 'Processing...' : 'Create Refund'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-muted-foreground">No payments found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
