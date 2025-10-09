"use client";

import { useState, useTransition, useRef } from "react";
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
import {
  UppyPDFUploader,
  type UppyPDFUploaderHandle,
} from "@/components/ui/uppy-pdf-uploader";

const resumeSchema = z.object({
  resumeUrl: z.string().url("Invalid URL").optional(),
});

type FormValues = z.infer<typeof resumeSchema>;

export default function ResumeListingForm() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [resumeScore, setResumeScore] = useState<ResumeScore | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const uploaderRef = useRef<UppyPDFUploaderHandle | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(resumeSchema as any) as any,
  });

  const setResumeUrl = trpc.auth.updateResume.useMutation({
    onSuccess: () => setSuccess("Resume uploaded successfully."),
    onError: (e) => setError(e.message),
  });

  const analyzeFile = async (file: File) => {
    try {
      setAnalyzing(true);
      const text = await parsePDF(file);
      const score = scoreResume(text);
      setResumeScore(score);
    } catch (err) {
      console.error("Resume analysis failed:", err);
      setError("Failed to analyze resume. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUploadToProfile = async () => {
    setError("");
    setSuccess("");
    const uploader = uploaderRef.current;
    if (!uploader) return;

    const file = uploader.getFile();
    if (!file) {
      setError("Please select a PDF resume first.");
      return;
    }

    startTransition(async () => {
      const url = await uploader.startUpload();
      if (!url) return;

      try {
        await setResumeUrl.mutateAsync({ resumeUrl: url });
        router.push("/jobs");
      } catch (e: any) {
        setError(e?.message || "Failed to save resume");
      }
    });
  };

  return (
    <div className="space-y-6 w-full max-w-2xl md:space-y-8">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-2xl font-bold font-outfit">Upload Resume</h1>
        <p className="text-muted-foreground font-outfit">
          Upload your PDF resume to attach it to your profile
          <br />
          and instantly analyze its quality score.
        </p>
      </div>

      <Form {...form}>
        <div className="space-y-6">
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

          <FormField
            control={form.control}
            name="resumeUrl"
            render={() => (
              <FormItem>
                <FormLabel>Resume (PDF)</FormLabel>
                <FormControl>
                  <UppyPDFUploader
                    ref={uploaderRef}
                    note="Upload your resume (PDF, max 2 MB)"
                    onFileSelect={analyzeFile}
                    onUploadError={(err) => setError(err)}
                    onUploadSuccess={(url) => form.setValue("resumeUrl", url)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {analyzing && (
            <p className="text-sm text-gray-500 animate-pulse">
              Analyzing resume...
            </p>
          )}
          {resumeScore && !analyzing && (
            <div className="mt-4">
              <ResumeScoreCard
                score={resumeScore.score}
                breakdown={resumeScore.breakdown}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button
            onClick={handleUploadToProfile}
            disabled={isPending || analyzing || !resumeScore}
            className="w-full bg-black text-white hover:bg-black/90"
          >
            Upload to Profile
          </Button>
        </div>
      </Form>
    </div>
  );
}
