"use client";

import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { toast } from "sonner";
import { Progress } from "@workspace/ui/components/progress";
import { useState } from "react";
import { PaymentStatus } from "@workspace/db";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function BillingPageClient() {
  const t = useTranslations("Billing");
  const utils = trpc.useUtils();
  const { data: sub } = trpc.subscription.getCurrentSubscription.useQuery();
  const { data: usage } = trpc.subscription.getUsageStats.useQuery(undefined, {
    enabled: !!sub,
  });
  const [paymentHistoryPage, setPaymentHistoryPage] = useState(0);

  const { data: paymentHistory, isLoading: loadingPayments } =
    trpc.subscription.getPaymentHistory.useQuery({
      limit: 10,
      offset: paymentHistoryPage * 10,
    });

  const cancel = trpc.subscription.cancelSubscription.useMutation({
    onSuccess: async () => {
      toast.success(t("toasts.cancel"));
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const pause = trpc.subscription.pauseSubscription.useMutation({
    onSuccess: async () => {
      toast.success(t("toasts.pause"));
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resume = trpc.subscription.resumeSubscription.useMutation({
    onSuccess: async () => {
      toast.success(t("toasts.resume"));
      await utils.subscription.getCurrentSubscription.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.SUCCEEDED:
        return (
          <Badge variant="default" className="bg-green-500">
            Paid
          </Badge>
        );
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount / 100);
  };

  const getSubscriptionStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      ACTIVE: { variant: "default", label: "Active" },
      CANCELED: { variant: "destructive", label: "Canceled" },
      PAUSED: { variant: "secondary", label: "Paused" },
      PAST_DUE: { variant: "destructive", label: "Past Due" },
      TRIALING: { variant: "outline", label: "Trial" },
    };

    const statusInfo = statusMap[status] || {
      variant: "outline",
      label: status,
    };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="mx-auto space-y-8">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold font-outfit">{t("title")}</h1>
        <p className="text-muted-foreground font-outfit">{t("subtitle")}</p>
      </div>

      <Card className="border border-gray-200/60 shadow-sm bg-gradient-to-br from-white to-gray-50 rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {t("currentPlan")}
            </CardTitle>
            {getSubscriptionStatusBadge(sub?.status || "")}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {sub ? (
            <>
              {/* Plan name + period */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {sub.plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("details.period")} {sub.plan.interval || "monthly"}
                  </p>
                </div>

                <div className="flex gap-2">
                  {sub.status === "PAUSED" ? (
                    <Button
                      onClick={() => resume.mutate()}
                      disabled={resume.isPending}
                    >
                      {resume.isPending ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />{" "}
                          {t("actions.resuming")}
                        </>
                      ) : (
                        t("actions.resume")
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
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />{" "}
                            {t("actions.pausing")}
                          </>
                        ) : (
                          t("actions.pause")
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => cancel.mutate({ immediately: false })}
                        disabled={cancel.isPending}
                      >
                        {cancel.isPending ? (
                          <>
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />{" "}
                            {t("actions.canceling")}
                          </>
                        ) : (
                          t("actions.cancel")
                        )}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Divider */}
              <Separator className="my-4" />

              {/* Billing details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Billing Period</p>
                  <p className="font-medium text-gray-900">
                    {new Date(
                      sub.currentPeriodStart || ""
                    ).toLocaleDateString()}{" "}
                    →{" "}
                    {new Date(sub.currentPeriodEnd || "").toLocaleDateString()}
                  </p>
                </div>
                {sub.paddleSubscriptionId && (
                  <div>
                    <p className="text-muted-foreground">Subscription ID</p>
                    <p className="font-mono text-xs text-gray-700">
                      {sub.paddleSubscriptionId}
                    </p>
                  </div>
                )}
              </div>

              {sub.canceledAt && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Ends on{" "}
                    {new Date(sub.currentPeriodEnd || "").toLocaleDateString()}.
                    You’ll retain access until then.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              No active subscription.{" "}
              <a href="/subscription" className="text-primary hover:underline">
                Choose a plan
              </a>{" "}
              to get started.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200/60 shadow-sm bg-white/60 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            {t("history.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : paymentHistory?.payments?.length ? (
            <>
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead>{t("table.date")}</TableHead>
                      <TableHead>{t("table.description")}</TableHead>
                      <TableHead>{t("table.amount")}</TableHead>
                      <TableHead>{t("table.status")}</TableHead>
                      <TableHead>{t("table.method")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.payments.map((p) => (
                      <TableRow
                        key={p.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell>
                          {new Date(
                            p.paidAt || p.createdAt
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {p.description || p.subscription?.plan?.displayName}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(p.amount, p.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell className="text-muted-foreground capitalize">
                          {p.paymentMethod?.replace("_", " ") || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {paymentHistory.hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPaymentHistoryPage((p) => p + 1)}
                  >
                    {t("history.loadMore")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("history.empty")}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200/60 shadow-sm bg-white/60 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Plan Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sub?.plan && usage ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: "Job Listings",
                  used: usage.jobListingsUsed,
                  limit: usage.jobListingsLimit,
                },
                {
                  label: "Service Listings",
                  used: usage.serviceListingsUsed,
                  limit: usage.serviceListingsLimit,
                },
                {
                  label: "Task Listings",
                  used: usage.taskListingsUsed,
                  limit: usage.taskListingsLimit,
                },
              ].map((item) => {
                const pct = item.limit ? (item.used / item.limit) * 100 : 0;
                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm hover:shadow transition"
                  >
                    <div className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="text-xl font-semibold text-gray-900">
                      {item.used}/{item.limit || "∞"}
                    </div>
                    <Progress value={pct} className="h-2 mt-2 bg-gray-200" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.limit
                        ? `${Math.max(item.limit - item.used, 0)} remaining`
                        : "Unlimited"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Subscribe to a plan to see your features.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
