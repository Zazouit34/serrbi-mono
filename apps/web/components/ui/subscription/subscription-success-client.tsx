"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useTranslations, useMessages } from "next-intl";

import { jobCategoryValues } from "@workspace/ui/lib/job-enum";

import { formatJobCategory } from "@workspace/ui/lib/formatter";
import { jobCategoryIcons } from "@/components/ui/config/job-filters-config";
import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";
import rolesByCategory from "@workspace/ui/data/auto-apply-roles.json";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { UppyPDFUploader, type UppyPDFUploaderHandle } from "@/components/ui/uppy-pdf-uploader";
import { parsePDF } from "@/app/utils/pdf/prase-pdf";

type JobCategory = (typeof jobCategoryValues)[number];

// 🔥 Clean, clear 2-step success page
export default function SubscriptionSuccessPage() {
  const t = useTranslations("SubscriptionSuccess");
  const tAll = useTranslations();
  const tA = useTranslations("AutoApply");
  const messages = useMessages() as any;
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
  const [roles, setRoles] = useState<string[]>([]);
const [open, setOpen] = useState(true);
const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
const uploaderRef = useRef<UppyPDFUploaderHandle | null>(null);
const setResumeUrl = trpc.auth.updateResume.useMutation();
const setResumeEmbedding = trpc.auth.updateResumeEmbedding.useMutation();

  const handleOpenChange = (nextOpen: boolean) => {
    // Prevent closing the dialog until the final step
  if (step === 4) {
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
      toast.success(t("paymentSuccessToast"));
    }
  }, [searchParams, refetchSubscription]);

  useEffect(() => {
    if (data) {
      setEnabled(!!data.autoApplyEnabled);
      setCategory(data.autoApplyCategory ?? null);
      setKeywords(data.autoApplyKeywords ?? []);
      setRoles((data as any).autoApplyRoles ?? []);
    }
  }, [data]);

  const suggestions = useMemo(() => {
    return category ? ((keywordsByCategory as any)[category] ?? []) : [];
  }, [category]);
  const roleSuggestions = useMemo(() => {
    return category ? ((rolesByCategory as any)[category] ?? []) : [];
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
        roles,
      });
      toast.success(tA("toasts.saved"));
      setStep(4);
    } catch (e: any) {
      toast.error(e?.message || tA("toasts.saveFailed"));
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
                {t("step1.title")}
              </DialogTitle>
              <DialogDescription className="text-center">
                {t("step1.descPrefix")} {" "}
                <span className="font-medium text-foreground">
                  {currentUser?.name},
                </span>
                {" "}
                <span className="font-semibold text-foreground">
                  {sub?.plan.name}
                </span>{" "}
                {t("step1.descSuffix")}
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-center text-muted-foreground">
              {t("step1.nextHint")}
            </div>
            <DialogFooter>
              <Button
                className="text-white bg-black hover:bg-black/90"
                onClick={() => setStep(2)}
              >
                {t("next")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>{tAll("ResumeForm.headingTitle")}</DialogTitle>
              <DialogDescription>
                {tAll("ResumeForm.headingSubtitle")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <UppyPDFUploader
                ref={uploaderRef}
                note={tAll("ResumeForm.note")}
                onUploadError={(err) => toast.error(err)}
                onUploadSuccess={async (url) => {
                  try {
                    await setResumeUrl.mutateAsync({ resumeUrl: url });
                    toast.success(tAll("ResumeForm.uploadSuccess"));
                    // Best-effort: also compute resume embedding if we still have the file in memory
                    const file = uploaderRef.current?.getFile();
                    if (file) {
                      const text = await parsePDF(file);
                      if (text) {
                        await setResumeEmbedding.mutateAsync({ resumeText: text });
                      }
                    }
                  } catch (e: any) {
                    toast.error(e?.message || tAll("ResumeForm.saveFailed"));
                  }
                }}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                {t("back")}
              </Button>
              <Button
                className="text-white bg-black hover:bg-black/90"
                onClick={async () => {
                  if (!uploaderRef.current) return;
                  const file = uploaderRef.current.getFile();
                  if (!file) return;
                  const url = await uploaderRef.current.startUpload();
                  if (url) {
                    try {
                      await setResumeUrl.mutateAsync({ resumeUrl: url });
                      toast.success(tAll("ResumeForm.uploadSuccess"));
                      // Parse PDF and update resume embedding based on the uploaded file
                      const text = await parsePDF(file);
                      if (text) {
                        await setResumeEmbedding.mutateAsync({ resumeText: text });
                      }
                      setStep(3);
                    } catch (e: any) {
                      toast.error(e?.message || tAll("ResumeForm.saveFailed"));
                    }
                  }
                }}
              >
                {t("saveNext")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>{t("step2.title")}</DialogTitle>
              <DialogDescription>
                {t("step2.desc")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl border bg-white/70">
                <Label htmlFor="auto-apply">{t("enableAutoApply")}</Label>
                <Switch
                  id="auto-apply"
                  checked={enabled}
                  onCheckedChange={(v) => setEnabled(v)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{t("jobCategory")}</Label>
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
                        {tAll(`Enums.JobCategory.${c}`)}
                        {selected && <Check className="w-3 h-3 text-black" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {enabled && (
                <div className="space-y-2">
                  <Label className="text-sm">{t("tags")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((k) => {
                      const slug = k
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                      const has = messages?.AutoApply?.keywords && slug in messages.AutoApply.keywords;
                      const label = has ? tA(`keywords.${slug}`) : k;
                      return (
                        <span
                          key={k}
                          className="flex gap-2 items-center px-3 py-1 text-sm bg-gray-100 rounded-full"
                        >
                          {label}
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            onClick={() => removeKeyword(k)}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions
                      .filter((s: string) => !keywords.includes(s))
                      .slice(0, 12)
                      .map((s: string) => {
                        const slug = s
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)/g, "");
                        const has = messages?.AutoApply?.keywords && slug in messages.AutoApply.keywords;
                        const label = has ? tA(`keywords.${slug}`) : s;
                        return (
                          <Button
                            key={s}
                            variant="outline"
                            size="sm"
                            onClick={() => addKeyword(s)}
                          >
                            + {label}
                          </Button>
                        );
                      })}
                  </div>
                </div>
              )}

              {enabled && (
                <div className="space-y-2">
                  <Label className="text-sm">{t("roles")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {roleSuggestions.map((r: string) => {
                      const selected = roles.includes(r);
                      const slug = r
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                      const has = messages?.AutoApply?.roles && slug in messages.AutoApply.roles;
                      const label = has ? tA(`roles.${slug}`) : r;
                      return (
                        <button
                          key={r}
                          disabled={!enabled}
                          onClick={() =>
                            setRoles((prev) =>
                              selected ? prev.filter((x) => x !== r) : [...prev, r]
                            )
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
                            selected
                              ? "border-black bg-white/80 text-black shadow-sm"
                              : "border-gray-200 text-gray-700 hover:bg-gray-50"
                          } ${!enabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {selected && <Check className="w-3 h-3 text-black" />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>
                {t("back")}
              </Button>
              <Button
                className="text-white bg-black hover:bg-black/90"
                onClick={savePrefs}
                disabled={mutation.isPending}
              >
                {t("saveNext")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle>{t("step3.title")}</DialogTitle>
              <DialogDescription className="space-y-3 text-sm text-muted-foreground">
                {t("step3.desc1")}
              </DialogDescription>
              <div className="space-y-3 text-sm text-muted-foreground">
                <ol className="space-y-2 list-decimal list-inside">
                  <li className="flex gap-3 items-start">
                    <User className="w-4 h-4 text-black flex-none mt-0.5" />
                    {t("step3.list.userMenu")}
                  </li>

                  <li className="flex gap-3 items-start">
                    <Zap
                      className="w-4 h-4 text-yellow-600 flex-none mt-0.5"
                      aria-hidden="true"
                    />
                    <div>{t("step3.list.autoApply")}</div>
                  </li>
                </ol>
              </div>
            </DialogHeader>
            <div className="flex gap-3 justify-end">
              <Link
                href="/account/billing"
                className="inline-flex items-center px-4 py-2 text-white bg-black rounded-md hover:bg-black/90"
              >
                {t("manageSubscription")}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 rounded-md border border-input bg-background hover:bg-accent"
              >
                {t("goDashboard")}
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
