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
import { useTranslations, useLocale } from "next-intl";
import { format as formatDate } from "date-fns";

export default function BillingPageClient() {
  const t = useTranslations("Billing");
  const locale = useLocale();
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
            {t("statuses.SUCCEEDED")}
          </Badge>
        );
      case PaymentStatus.FAILED:
        return <Badge variant="destructive">{t("statuses.FAILED")}</Badge>;
      case PaymentStatus.REFUNDED:
        return <Badge variant="secondary">{t("statuses.REFUNDED")}</Badge>;
      case PaymentStatus.PENDING:
        return <Badge variant="outline">{t("statuses.PENDING")}</Badge>;
      default:
        return <Badge variant="outline">{t(`statuses.${status}`)}</Badge>;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(amount / 100);
  };

  const formatDateDDMMYYYY = (dateValue?: string | number | Date) => {
    if (!dateValue) return "";
    return formatDate(new Date(dateValue), "dd/MM/yyyy");
  };

  const getSubscriptionStatusBadge = (status: string) => {
    const variantMap: Record<string, any> = {
      ACTIVE: "default",
      CANCELED: "destructive",
      PAUSED: "secondary",
      PAST_DUE: "destructive",
      TRIALING: "outline",
      PENDING: "outline",
      FAILED: "destructive",
      SUCCEEDED: "default",
      REFUNDED: "secondary",
    };
    const variant = variantMap[status] ?? "outline";
    return <Badge variant={variant}>{t(`statuses.${status}`)}</Badge>;
  };

  return (
    <div className="mx-auto space-y-8">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold font-outfit">{t("title")}</h1>
        <p className="text-muted-foreground font-outfit">{t("subtitle")}</p>
      </div>

      <Card className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border shadow-sm border-gray-200/60">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
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
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {sub.plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("details.period")} {
                      (() => {
                        const raw = (sub.plan.interval as string) || "monthly";
                        const map: Record<string, string> = {
                          month: "monthly",
                          months: "monthly",
                          monthly: "monthly",
                          year: "yearly",
                          yearly: "yearly",
                          quarter: "quarterly",
                          quarterly: "quarterly",
                        };
                        const key = map[raw] || "monthly";
                        return t(`intervals.${key}`);
                      })()
                    }
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
              <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">{t("details.billingPeriod")}</p>
                  <p className="font-medium text-gray-900">
                    {formatDateDDMMYYYY(sub.currentPeriodStart || "")} {locale === "ar" ? "←" : "→"} {formatDateDDMMYYYY(sub.currentPeriodEnd || "")}
                  </p>
                </div>
                {sub.paddleSubscriptionId && (
                  <div>
                    <p className="text-muted-foreground">{t("details.subscriptionId")}</p>
                    <p className="font-mono text-xs text-gray-700">
                      {sub.paddleSubscriptionId}
                    </p>
                  </div>
                )}
              </div>

              {sub.canceledAt && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    {t("endsOn")} {formatDateDDMMYYYY(sub.currentPeriodEnd || "")}.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              {t("noActive")} {" "}
              <a href="/subscription" className="text-primary hover:underline">
                {t("choosePlan")}
              </a>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm border-gray-200/60 bg-white/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            {t("history.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
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
                        className="transition-colors hover:bg-gray-50"
                      >
                        <TableCell>
                          {formatDateDDMMYYYY(p.paidAt || p.createdAt)}
                        </TableCell>
                        <TableCell>
                          {p.description || p.subscription?.plan?.displayName}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(p.amount, p.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {p.paymentMethod ? t(`methods.${p.paymentMethod}`) : "-"}
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
            <div className="py-8 text-sm text-center text-muted-foreground">
              {t("history.empty")}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm border-gray-200/60 bg-white/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            {t("usage.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sub?.plan && usage ? (
            usage.autoApplyLimit ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm transition hover:shadow">
                  <div className="text-sm font-medium text-muted-foreground">{t("usage.autoApply")}</div>
                  <div className="text-xl font-semibold text-gray-900">{usage.autoAppliedUsed}/{usage.autoApplyLimit}</div>
                  <Progress value={(usage.autoAppliedUsed / usage.autoApplyLimit) * 100} className="mt-2 h-2 bg-gray-200" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {`${Math.max((usage.autoApplyLimit || 0) - (usage.autoAppliedUsed || 0), 0)} ${t("remaining")}`}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground">{t("usage.smartMatch")}</div>
                  <div className="mt-1 text-sm text-gray-900">{usage.smartMatchAccess ? t("unlimited") : "-"}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  {t("Subscription.features.unlimitedApplications")}
                </div>
                {usage.resumeAtsScoreAccess && (
                  <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    {t("Subscription.features.resumeAtsScore")}
                  </div>
                )}
                {usage.jobBoardAccess && (
                  <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    {t("Pricing.features.jobBoardAccess")}
                  </div>
                )}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">{t("usage.subtitle")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
