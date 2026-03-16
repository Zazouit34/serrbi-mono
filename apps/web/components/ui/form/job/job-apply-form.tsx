"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { trpc } from "@/app/_trpc/client";
import { useForm } from "react-hook-form";
import { CloudUpload, Paperclip, ArrowLeft, ExternalLink } from "lucide-react";
import {
  FileInput,
  FileUploader,
  FileUploaderContent,
  FileUploaderItem,
} from "./file-input";
import { FormSuccess } from "../form-success";
import { FormError } from "../form-error";
import { LoadingSwap } from "../loading-swap";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  jobApplyFormSchema,
  type JobApplyFormValues,
} from "@workspace/ui/lib/validation-schemas";

export function JobApplyForm({
  jobId,
  jobTitle,
  applicationUrl
}: {
  jobId: string;
  jobTitle: string;
  applicationUrl: string | null;
}) {
  const t = useTranslations("JobApply");
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user?.email;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const [cvFile, setCvFile] = useState<File | null>(null);
  const form = useForm<JobApplyFormValues>({
    resolver: zodResolver(jobApplyFormSchema),
    defaultValues: { name: "", email: "" },
  });

  // Fetch current user info when logged in (includes resumeUrl via protectedProcedure)
  const userQuery = trpc.auth.userData.useQuery(undefined, {
    enabled: !!session?.user?.email,
  });
  const resumeUrl = userQuery.data?.user?.resumeUrl as string | undefined;
  const hasSavedResume = !!resumeUrl;

  // Prefill name/email for logged-in user
  useEffect(() => {
    const u = userQuery.data?.user as { name?: string | null; email?: string | null } | undefined;
    if (u?.email || u?.name) {
      form.reset({
        name: u?.name ?? "",
        email: u?.email ?? "",
        cv: undefined as any,
      });
    }
  }, [userQuery.data?.user, form]);

  const submitApplicationMutation = trpc.job.submitApplication.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message);
      setTimeout(() => {
        router.push("/jobs");
      }, 2000);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  async function onSubmit(values: JobApplyFormValues) {
    setSuccess("");
    setError("");
    if (!isLoggedIn) {
      const callback = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/jobs";
      router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }
    startTransition(async () => {
      try {
        let cvData: string | undefined;
        let cvFilename: string | undefined;

        if (cvFile) {
          cvData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(",")[1];
              resolve(base64 as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(cvFile);
          });
          cvFilename = cvFile.name;
        }

        await submitApplicationMutation.mutateAsync({
          jobId,
          jobTitle,
          name: values.name,
          email: values.email,
          cv: !!cvFile,
          cvData,
          cvFilename,
          resumeUrl: !cvFile && hasSavedResume ? resumeUrl : undefined,
        });
      } catch {
        // handled in onError
      }
    });
  }

  const dropZoneConfig = {
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
    maxSize: 2 * 1024 * 1024, // 2MB to match Uppy
  };

  const handleApplyClick = () => {
    if (!isLoggedIn) {
      const callback = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/jobs";
      router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }

    if (applicationUrl) {
      // Redirect to external application URL
      window.open(applicationUrl, "_blank");
    } else {
      // Show the internal form
      setShowForm(true);
    }
  };

  return (
    <div className="flex flex-col py-8 w-full">
      {!showForm ? (
        <div className="flex relative items-center w-full">
          {/* Back button aligned left */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex absolute left-0 gap-1"
          >
            <ArrowLeft className="size-5" />
          </Button>

          {/* Apply button centered */}
          <div className="flex flex-1 justify-center">
            <Button className="w-48" onClick={handleApplyClick}>
              {applicationUrl ? (
                <>
                  {t("applyExternal")}
                  <ExternalLink className="ml-2 size-4" />
                </>
              ) : (
                t("apply")
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center w-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 space-y-6 w-full max-w-xl" // 👈 removed bg-white, rounded-xl, shadow-md
            >
              {/* Inline fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("name")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("namePlaceholder")}
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("emailPlaceholder")}
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* CV (saved or upload) */}
              {hasSavedResume ? (
                <div className="space-y-2">
                  <FormLabel>{t("resume")}</FormLabel>
                  <div className="flex justify-between items-center p-2 rounded-md border">
                    <span className="truncate">
                      {(() => {
                        try {
                          const last = new URL(resumeUrl!).pathname.split("/").pop() || "resume.pdf";
                          return decodeURIComponent(last);
                        } catch {
                          return resumeUrl!.split("/").pop() || "resume.pdf";
                        }
                      })()}
                    </span>
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-black underline"
                    >
                      {t("openResume")}
                    </a>
                  </div>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="cv"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t("cvUploadLabel")}</FormLabel>
                      <FormControl>
                        <FileUploader
                          value={cvFile ? [cvFile] : []}
                          onValueChange={(files) => {
                            const f = files?.[0] ?? null;
                            setCvFile(f);
                            form.setValue("cv", f as any, {
                              shouldValidate: true,
                            });
                          }}
                          dropzoneOptions={dropZoneConfig}
                          className="relative p-2 rounded-lg"
                        >
                          <FileInput className="outline-dashed outline-1 outline-slate-500">
                            <div className="flex flex-col justify-center items-center p-8 w-full">
                              <CloudUpload className="w-10 h-10 text-gray-500" />
                              <p className="mb-1 text-sm text-gray-500">
                                <span className="font-semibold">{t("clickToUpload")}</span>{" "}
                                {t("orDragDrop")}
                              </p>
                              <p className="text-xs text-gray-500">{t("accepted")}</p>
                            </div>
                          </FileInput>
                          <FileUploaderContent>
                            {cvFile && (
                              <FileUploaderItem index={0}>
                                <Paperclip className="w-4 h-4 stroke-current" />
                                <span>{cvFile.name}</span>
                              </FileUploaderItem>
                            )}
                          </FileUploaderContent>
                        </FileUploader>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormError message={error} />
              <FormSuccess message={success} />

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  <LoadingSwap isLoading={isPending}>
                    {t("submitApplication")}
                  </LoadingSwap>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
