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
import {
  FileUploader,
  FileUploaderContent,
  FileUploaderItem,
  FileInput,
} from "@/components/ui/form/job/file-input";
import { useRouter } from "next/navigation";
import { parsePDF } from "@/app/utils/pdf/prase-pdf";
import {
  scoreResume,
  type ResumeScore,
} from "@/app/utils/pdf/score-calculator";
import { ResumeScoreCard } from "@/components/ui/pdf/resume-score-card";

// 🔹 Only validate the file input
const fileSchema = z.object({
  file: z
    .array(z.instanceof(File))
    .min(1, "Please upload a PDF")
    .max(1, "Only one file allowed"),
});

type FormValues = z.infer<typeof fileSchema>;

export default function ResumeListingForm() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [resumeScore, setResumeScore] = useState<ResumeScore | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(fileSchema as any) as any,
    defaultValues: { file: [] },
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

    const file = values.file?.[0];
    if (!file) {
      setError("Please select a PDF resume.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch("/api/resume/upload", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Upload failed");
          return;
        }

        await setResumeUrl.mutateAsync({ resumeUrl: json.url });
        router.push("/jobs");
      } catch (e: any) {
        setError(e?.message || "Upload failed");
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

          {/* 🔹 Actual file upload */}
          {!hasResume && (
            <FormField
              control={form.control as any}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resume (PDF)</FormLabel>
                  <FormControl>
                    <FileUploader
                      value={field.value}
                      onValueChange={(files) => {
                        field.onChange(files);
                        const f = files?.[0];
                        if (f) {
                          setAnalyzing(true);
                          parsePDF(f)
                            .then((text) => setResumeScore(scoreResume(text)))
                            .catch((e) => console.warn("PDF parse failed:", e))
                            .finally(() => setAnalyzing(false));
                        } else {
                          setResumeScore(null);
                          setAnalyzing(false);
                        }
                      }}
                      dropzoneOptions={{
                        accept: { "application/pdf": [".pdf"] },
                        maxFiles: 1,
                        maxSize: 5 * 1024 * 1024,
                      }}
                    >
                      <FileUploaderContent>
                        <FileInput className="flex flex-col justify-center items-center p-12 text-center rounded-lg border-2 border-gray-400 border-dashed">
                          <p className="text-sm text-muted-foreground">
                            Drag & drop your PDF here, or{" "}
                            <span className="text-black">click to browse</span>
                          </p>
                        </FileInput>

                        {resumeScore || analyzing ? (
                          <div className="mt-3 w-full">
                            <ResumeScoreCard
                              score={resumeScore?.score ?? 0}
                              suggestions={resumeScore?.suggestions ?? []}
                              loading={analyzing}
                            />
                          </div>
                        ) : null}

                        {field.value?.map((f: File, i: number) => (
                          <FileUploaderItem
                            key={i}
                            index={i}
                            className="w-full"
                            data-size={f.size}
                            progress={100}
                          >
                            {f.name}
                          </FileUploaderItem>
                        ))}
                      </FileUploaderContent>
                    </FileUploader>
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
