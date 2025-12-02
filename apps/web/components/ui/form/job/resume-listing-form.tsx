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
import {
  UppyPDFUploader,
  type UppyPDFUploaderHandle,
} from "@/components/ui/uppy-pdf-uploader";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { parsePDF } from "@/app/utils/pdf/prase-pdf";

const resumeSchema = z.object({
  resumeUrl: z.string().url("Invalid URL").optional(),
});

type FormValues = z.infer<typeof resumeSchema>;

export default function ResumeListingForm() {
  const tResume = useTranslations("ResumeForm");
  const { data: session } = useSession();
  const { data: userData, refetch: refetchUser } = trpc.auth.userData.useQuery();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const uploaderRef = useRef<UppyPDFUploaderHandle | null>(null);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(resumeSchema as any) as any,
  });

  const setResumeUrl = trpc.auth.updateResume.useMutation({
    onSuccess: () => setSuccess(tResume("uploadSuccess")),
    onError: (e) => setError(e.message || tResume("saveFailed")),
  });
  const setResumeEmbedding = trpc.auth.updateResumeEmbedding.useMutation();

  const clearResume = trpc.auth.clearResume.useMutation({
    onSuccess: async () => {
      setSuccess(undefined);
      setError(undefined);
      form.setValue("resumeUrl", "");
      await refetchUser();
    },
    onError: (e) => setError(e.message || tResume("saveFailed")),
  });

  const handleUploadToProfile = async () => {
    setError("");
    setSuccess("");
    const uploader = uploaderRef.current;
    if (!uploader) return;

    const file = uploader.getFile();
    if (!file) {
      setError(tResume("selectFileFirst"));
      return;
    }

    startTransition(async () => {
      const url = await uploader.startUpload();
      if (!url) return;

      try {
        await setResumeUrl.mutateAsync({ resumeUrl: url });
        // Parse PDF on client and update resume embedding
        const text = await parsePDF(file);
        if (text) {
          await setResumeEmbedding.mutateAsync({ resumeText: text });
        }
        router.push("/jobs/resume-listing/new");
      } catch (e: any) {
        setError(e?.message || tResume("saveFailed"));
      }
    });
  };

  return (
    <div className="space-y-6 w-full max-w-2xl md:space-y-8">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-2xl font-bold font-outfit">{tResume("headingTitle")}</h1>
        <p className="text-muted-foreground font-outfit">{tResume("headingSubtitle")}</p>
      </div>

      <Form {...form}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormItem>
              <FormLabel>{tResume("name")}</FormLabel>
              <FormControl>
                <Input value={session?.user?.name || ""} disabled readOnly />
              </FormControl>
            </FormItem>

            <FormItem>
              <FormLabel>{tResume("email")}</FormLabel>
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
                <FormLabel>{tResume("resumeLabel")}</FormLabel>
                <FormControl>
                  {userData?.user?.resumeUrl ? (
                    <div className="flex relative gap-4 items-center p-3 bg-white rounded-lg border shadow-sm">
                      <div className="flex justify-center items-center w-10 h-10 font-semibold text-white bg-red-600 rounded-md">
                        PDF
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {userData?.user?.name ? `${userData.user.name}.pdf` : "resume.pdf"}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove resume"
                        className="text-gray-500 hover:text-red-600"
                        onClick={() => clearResume.mutate()}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <UppyPDFUploader
                      ref={uploaderRef}
                      note={tResume("note")}
                      onUploadError={(err) => setError(err)}
                      onUploadSuccess={(url) => {
                        form.setValue("resumeUrl", url);
                      }}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button
            onClick={handleUploadToProfile}
            disabled={isPending}
            className="w-full text-white bg-black hover:bg-black/90"
          >
            {tResume("uploadToProfile")}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {tResume("analyzerCta")}{" "}
            <Link
              href="/resume-analyzer"
              className="font-semibold text-black hover:underline"
            >
              {tResume("analyzerLink")}
            </Link>
          </p>
        </div>
      </Form>
    </div>
  );
}
