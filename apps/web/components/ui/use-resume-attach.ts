"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { parsePDF } from "@/app/utils/pdf/prase-pdf";
import { trpc } from "@/app/_trpc/client";

export type ResumeProfile = {
  jobTitle: string | null;
  skills: string[];
};

export type ResumeInsightData = {
  score: number;
  skillGaps: string[];
  improvements: string[];
  suggestedRoles?: string[];
};

type UseResumeAttachOptions = {
  isLoggedIn: boolean;
  locale: string;
  onStatusChange: (text: string) => void;
  onProgressChange: (value: number | null) => void;
  onFileNameChange: (name: string) => void;
  onAttached: (profile: ResumeProfile, insight: ResumeInsightData | null) => void;
  onError: () => void;
};

export function useResumeAttach({
  isLoggedIn,
  locale,
  onStatusChange,
  onProgressChange,
  onFileNameChange,
  onAttached,
  onError,
}: UseResumeAttachOptions) {
  const t = useTranslations("HeroSearchBar");
  const router = useRouter();
  const pathname = usePathname();
  const updateResumeUrl = trpc.auth.updateResume.useMutation();
  const updateResumeEmbedding = trpc.auth.updateResumeEmbedding.useMutation();

  const uploadFileWithProgress = async (
    url: string,
    file: File,
    onProgress: (value: number) => void,
  ): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const value = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        onProgress(value);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) { resolve(); return; }
        reject(new Error("Failed to upload resume file"));
      };
      xhr.onerror = () => reject(new Error("Failed to upload resume file"));
      xhr.send(file);
    });
  };

  const handleResumeAttach = async (file: File) => {
    if (!isLoggedIn) {
      const callback = pathname || "/";
      router.push(`/login?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }

    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      onStatusChange(t("resume.pdfOnly"));
      return;
    }

    onFileNameChange(file.name);
    onProgressChange(0);

    try {
      onStatusChange(t("resume.uploadText"));

      const presignedRes = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/pdf",
          fileType: "resume",
        }),
      });
      if (!presignedRes.ok) throw new Error("Failed to get presigned URL");
      const uploadData = await presignedRes.json();

      await uploadFileWithProgress(uploadData.presignedUrl, file, (value) => {
        onProgressChange(value);
      });
      onProgressChange(100);

      await updateResumeUrl.mutateAsync({ resumeUrl: uploadData.publicUrl });

      onStatusChange(t("resume.receiveText"));

      const resumeText = await parsePDF(file);
      const embeddingResult = await updateResumeEmbedding.mutateAsync({ resumeText });

      onStatusChange(t("resume.doneText"));
      onProgressChange(null);

      const profile: ResumeProfile = {
        jobTitle: (embeddingResult as any)?.profile?.jobTitle ?? null,
        skills: (embeddingResult as any)?.profile?.skills ?? [],
      };

      // Call resume insight API with the parsed text
      let insight: ResumeInsightData | null = null;
      try {
        const insightRes = await fetch("/api/chat/resume-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: resumeText, locale }),
        });
        if (insightRes.ok) {
          const data = await insightRes.json();
          if (typeof data.overallScore === "number") {
            insight = {
              score: data.overallScore,
              skillGaps: data.skillGaps ?? [],
              improvements: data.improvements ?? [],
              suggestedRoles: data.suggestedRoles ?? [],
            };
          }
        }
      } catch {
        // Non-fatal — upload and embedding already succeeded
      }

      onAttached(profile, insight);
    } catch (error) {
      console.error("Resume attach flow failed", error);
      onStatusChange(t("resume.errorText"));
      onProgressChange(null);
      onError();
    }
  };

  return { handleResumeAttach };
}
