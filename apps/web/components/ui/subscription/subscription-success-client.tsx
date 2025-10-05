"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Check } from "lucide-react";
import { useSession } from "next-auth/react";

import { jobCategoryValues } from "@workspace/ui/lib/job-enum";

import { formatJobCategory } from "@workspace/ui/lib/formatter";
import { jobCategoryIcons } from "@/components/ui/config/job-filters-config";
import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";

type JobCategory = (typeof jobCategoryValues)[number];

// 🔥 Clean, clear 2-step success page
export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUser = session?.user;
  // subscription data
  const { data: sub } = trpc.subscription.getCurrentSubscription.useQuery();

  // auto-apply preferences
  const { data, refetch } = trpc.auth.getAutoApplyPrefs.useQuery();
  const mutation = trpc.auth.updateAutoApplyPrefs.useMutation();

  const [enabled, setEnabled] = useState(false);
  const [category, setCategory] = useState<JobCategory | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);

  // ✅ refetch subscription data and toast
  const { refetch: refetchSubscription } =
    trpc.subscription.getCurrentSubscription.useQuery();

  useEffect(() => {
    const txn = searchParams.get("_ptxn");
    const sub = searchParams.get("_psub");

    if (txn || sub) {
      refetchSubscription();
      toast.success("Payment successful! Your subscription is now active.");
    }
  }, [searchParams, refetchSubscription]);

  useEffect(() => {
    if (data) {
      setEnabled(!!data.autoApplyEnabled);
      setCategory(data.autoApplyCategory ?? null);
      setKeywords(data.autoApplyKeywords ?? []);
    }
  }, [data]);

  const suggestions = useMemo(() => {
    return category ? ((keywordsByCategory as any)[category] ?? []) : [];
  }, [category]);

  const addKeyword = (k: string) => {
    if (!k) return;
    if (!keywords.includes(k)) setKeywords([...keywords, k]);
  };
  const removeKeyword = (k: string) => {
    setKeywords(keywords.filter((x) => x !== k));
  };

  const savePrefs = async () => {
    try {
      await mutation.mutateAsync({
        enabled,
        category,
        keywords,
      });
      toast.success("Auto-apply preferences saved!");
      router.push("/jobs"); // ✅ redirect after save
    } catch (e: any) {
      toast.error(e?.message || "Failed to save preferences");
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 space-y-8 max-w-3xl">
      {/* 🎉 Success Card */}
      <Card className="border border-green-200 shadow-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            🎉 Thank you,{" "}
            <span className="font-medium text-foreground">
              {currentUser?.name}
            </span>
            !<br />
            Your payment for the{" "}
            <span className="font-semibold text-foreground">
              {sub?.plan.name}
            </span>{" "}
            plan has been confirmed. You now have full access to all premium job
            tools. <br />{" "}
            <span className="text-foreground font-medium">
              Please set up your preferences below.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* ⚙️ Auto-Apply Setup Card */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-center">
            Set Up Auto-Apply
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Enable Switch */}
          <div className="flex gap-3 items-center justify-between">
            <Label htmlFor="auto-apply">Enable Auto-apply</Label>
            <Switch
              id="auto-apply"
              checked={enabled}
              onCheckedChange={(v) => setEnabled(v)}
            />
          </div>

          {/* Step 2: Category Select via Popover */}
          <div className="space-y-2">
            <Label>Job Category</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-1/2 justify-start"
                  disabled={!enabled}
                >
                  {category ? (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon =
                          jobCategoryIcons[
                            category as keyof typeof jobCategoryIcons
                          ];
                        return Icon ? (
                          <Icon className="w-4 h-4 text-black" />
                        ) : null;
                      })()}
                      <span className="text-sm font-medium text-black">
                        {formatJobCategory(category)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Select Category
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="flex flex-wrap gap-2">
                  {jobCategoryValues.map((c) => {
                    const Icon =
                      jobCategoryIcons[c as keyof typeof jobCategoryIcons];
                    const selected = category === c;
                    return (
                      <Button
                        key={c}
                        variant="outline"
                        size="sm"
                        className={`rounded-full text-xs font-medium h-8 px-3 ${
                          selected
                            ? "bg-white/80 border-black text-black"
                            : "hover:bg-gray-50 border-gray-200 text-gray-700"
                        }`}
                        onClick={() => setCategory(c)}
                      >
                        {Icon && <Icon className="w-3 h-3 mr-1 text-black" />}
                        {formatJobCategory(c)}
                        {selected && (
                          <Check className="w-3 h-3 ml-1 text-black" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Step 3: Keywords (tag-like chips) */}
          {enabled && (
            <div className="space-y-2">
              <Label>Keywords</Label>
              <div className="flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2"
                  >
                    {k}
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => removeKeyword(k)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter((s: string) => !keywords.includes(s))
                  .slice(0, 10)
                  .map((s: string) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      onClick={() => addKeyword(s)}
                    >
                      + {s}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          <div className="pt-4 text-start">
            <Button
              onClick={savePrefs}
              disabled={mutation.isPending}
              className="bg-black hover:bg-black/80"
            >
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-4 justify-center pt-4">
        <Link
          href="/account/billing"
          className="inline-flex items-center px-4 py-2 rounded-md bg-black/90 text-primary-foreground hover:bg-black/90"
        >
          Manage Subscription
        </Link>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-md border border-input bg-background hover:bg-accent"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
