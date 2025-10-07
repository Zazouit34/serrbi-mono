"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { trpc } from "@/app/_trpc/client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { useRouter } from "next/navigation";
import { parsePDF } from "@/app/utils/pdf/prase-pdf";
import {
  scoreResume,
  type ResumeScore,
} from "@/app/utils/pdf/score-calculator";
import { ResumeScoreCard } from "@/components/ui/pdf/resume-score-card";
import { UppyPDFUploader } from "@/components/ui/uppy-pdf-uploader";

// Schema for resume URL
const resumeSchema = z.object({
  resumeUrl: z.string().url("Invalid URL").optional(),
});

type FormValues = z.infer<typeof resumeSchema>;

export default function ResumeListingForm() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [resumeScore, setResumeScore] = useState<ResumeScore | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(resumeSchema as any) as any,
    defaultValues: { resumeUrl: undefined },
  });

  const setResumeUrl = trpc.auth.updateResume.useMutation({
    onSuccess: () => setSuccess("Resume uploaded successfully."),
    onError: (e) => setError(e.message),
  });

  const userQuery = trpc.auth.userData.useQuery(); // fetch current user including resumeUrl
  const clearResume = trpc.auth.clearResume.useMutation({
    onSuccess: () => userQuery.refetch(),
  });

  const currentUrl = userQuery.data?.user?.resumeUrl as string | undefined;
  const hasResume = !!currentUrl;

  async function onSubmit(values: FormValues) {
    setError("");
    setSuccess("");

    if (!values.resumeUrl) {
      setError("Please upload a PDF resume.");
      return;
    }

    startTransition(async () => {
      try {
        await setResumeUrl.mutateAsync({ resumeUrl: values.resumeUrl! });
        router.push("/jobs");
      } catch (e: any) {
        setError(e?.message || "Failed to save resume");
      }
    });
  }

  return (
    <div className="space-y-4 w-full max-w-2xl md:space-y-8">
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold font-outfit">Upload Resume</h1>
        <p className="text-center text-muted-foreground font-outfit">
          Upload your PDF resume to attach it to your profile.
          <br />
          and get an instant CV score analysis.
        </p>
      </div>

      {hasResume ? (
        <div className="space-y-2">
          <p className="text-sm">Current resume:</p>

          <FileUploader
            value={[]} // dummy provider state
            onValueChange={() => {}} // no-op
            dropzoneOptions={{
              accept: { "application/pdf": [".pdf"] },
              maxFiles: 1,
              maxSize: 5 * 1024 * 1024,
            }}
          >
            <FileUploaderContent className="p-2 rounded-md border">
              <FileUploaderItem index={0} className="w-full [&>button]:hidden">
                <div className="flex justify-between items-center w-full">
                  <span className="truncate">
                    {decodeURIComponent(
                      currentUrl.split("/").pop() || "resume.pdf"
                    )}
                  </span>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-black underline"
                  >
                    Open
                  </a>
                </div>
              </FileUploaderItem>
            </FileUploaderContent>
          </FileUploader>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearResume.mutate()}
              disabled={clearResume.isPending}
              className="mt-2"
            >
              Remove current resume
            </Button>
          </div>
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 🔹 Just display user name & email (readonly) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input value={session?.user?.name || ""} disabled readOnly />
              </FormControl>
            </FormItem>

            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input value={session?.user?.email || ""} disabled readOnly />
              </FormControl>
            </FormItem>
          </div>

          {/* Resume Upload with Uppy */}
          {!hasResume && (
            <FormField
              control={form.control as any}
              name="resumeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resume (PDF)</FormLabel>
                  <FormControl>
                    <div>
                      <UppyPDFUploader
                        onUploadSuccess={(url) => {
                          field.onChange(url);
                          setSuccess("Resume uploaded successfully!");
                          setTimeout(() => setSuccess(""), 2000);
                        }}
                        onUploadError={(err) => {
                          setError(err);
                          setTimeout(() => setError(""), 3000);
                        }}
                        note="Upload your resume (PDF, max 2 MB)"
                      />
                      {field.value && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">
                            Current resume: {field.value.split("/").pop()}
                          </p>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button
            type="submit"
            disabled={isPending || hasResume}
            className="w-full"
          >
            Upload
          </Button>
        </form>
      </Form>
    </div>
  );
}
