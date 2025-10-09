"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
import { Check, User, Zap } from "lucide-react";
import { useSession } from "next-auth/react";

import { jobCategoryValues } from "@workspace/ui/lib/job-enum";

import { formatJobCategory } from "@workspace/ui/lib/formatter";
import { jobCategoryIcons } from "@/components/ui/config/job-filters-config";
import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";

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
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleOpenChange = (nextOpen: boolean) => {
    // Prevent closing the dialog until the final step
    if (step === 3) {
      setOpen(nextOpen);
    } else {
      setOpen(true);
    }
  };

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
      setStep(3);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save preferences");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {step === 1 && (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <img
                  src="/images/success.png"
                  alt="Success"
                  className="w-24 h-22"
                />
              </div>
              <DialogTitle className="text-center">
                Payment Successful!
              </DialogTitle>
              <DialogDescription className="text-center">
                Thank you,{" "}
                <span className="font-medium text-foreground">
                  {currentUser?.name}
                </span>
                . Your payment for the{" "}
                <span className="font-semibold text-foreground">
                  {sub?.plan.name}
                </span>{" "}
                plan is confirmed.
              </DialogDescription>
            </DialogHeader>
            <div className="text-center text-sm text-muted-foreground">
              Press Next to set up your auto-apply preferences.
            </div>
            <DialogFooter>
              <Button
                className="bg-black text-white hover:bg-black/90"
                onClick={() => setStep(2)}
              >
                Next
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Auto-Apply Setup</DialogTitle>
              <DialogDescription>
                Choose your job category and suggested tags. You can change
                these later from user-menu → auto-apply.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-xl bg-white/70">
                <Label htmlFor="auto-apply">Enable Auto-apply</Label>
                <Switch
                  id="auto-apply"
                  checked={enabled}
                  onCheckedChange={(v) => setEnabled(v)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Job Category</Label>
                <div className="flex flex-wrap gap-2">
                  {jobCategoryValues.map((c) => {
                    const Icon =
                      jobCategoryIcons[c as keyof typeof jobCategoryIcons];
                    const selected = category === c;
                    return (
                      <button
                        key={c}
                        disabled={!enabled}
                        onClick={() => setCategory(c)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                          selected
                            ? "border-black bg-white/80 text-black shadow-sm"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        } ${!enabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5 text-black" />}
                        {formatJobCategory(c)}
                        {selected && <Check className="w-3 h-3 text-black" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {enabled && (
                <div className="space-y-2">
                  <Label className="text-sm">Tags (keywords)</Label>
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
                      .slice(0, 12)
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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="bg-black text-white hover:bg-black/90"
                onClick={savePrefs}
                disabled={mutation.isPending}
              >
                Save & Next
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>All set!</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground space-y-3">
                Your auto-apply preferences are saved. You can change them
                anytime.
              </DialogDescription>
              <DialogDescription className="text-sm text-muted-foreground space-y-3">
                <ol className="list-decimal list-inside space-y-2">
                  <li className="flex items-start gap-3">
                    <User className="w-4 h-4 text-black flex-none mt-0.5" />
                    Open the{" "}
                    <span className="font-semibold text-black">
                      User menu
                    </span>{" "}
                    (top-right).
                  </li>

                  <li className="flex items-start gap-3">
                    <Zap
                      className="w-4 h-4 text-yellow-600 flex-none mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      Select{" "}
                      <span className="font-semibold text-black">
                        Auto-apply
                      </span>{" "}
                      to view or edit your preferences.
                    </div>
                  </li>
                </ol>
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 justify-end">
              <Link
                href="/account/billing"
                className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white hover:bg-black/90"
              >
                Manage subscription
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 rounded-md border border-input bg-background hover:bg-accent"
              >
                Go to dashboard
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
