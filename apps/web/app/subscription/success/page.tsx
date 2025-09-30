"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/app/_trpc/client";
import { toast } from "sonner";

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  
  // Refetch subscription data to get the latest status
  const { refetch: refetchSubscription } = trpc.subscription.getCurrentSubscription.useQuery();

  useEffect(() => {
    const txn = searchParams.get('_ptxn');
    const sub = searchParams.get('_psub');
    
    if (txn) {
      setTransactionId(txn);
    }
    
    if (sub) {
      setSubscriptionId(sub);
    }

    // Refetch subscription data to ensure we have the latest status
    if (txn || sub) {
      refetchSubscription();
      toast.success('Payment successful! Your subscription is now active.');
    }
  }, [searchParams, refetchSubscription]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Thank you for your subscription. Your payment has been processed successfully.
            </p>
            
            {(transactionId || subscriptionId) && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {transactionId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID:</p>
                    <p className="font-mono text-sm">{transactionId}</p>
                  </div>
                )}
                {subscriptionId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Subscription ID:</p>
                    <p className="font-mono text-sm">{subscriptionId}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You can now access all the features of your subscription plan.
              </p>
              <p className="text-sm text-muted-foreground">
                A confirmation email will be sent to your registered email address.
              </p>
            </div>
            
            <div className="flex gap-4 justify-center pt-4">
              <Link 
                href="/account/billing"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Manage Subscription
              </Link>
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 border border-input bg-background rounded-md hover:bg-accent"
              >
                Go to Dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
