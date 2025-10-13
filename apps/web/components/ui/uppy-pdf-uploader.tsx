"use client";

import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import { useTranslations } from "next-intl";

export interface UppyPDFUploaderHandle {
  startUpload: () => Promise<string | null>; // returns public URL after upload
  clearFile: () => void;
  getFile: () => File | null;
}

interface UppyPDFUploaderProps {
  onFileSelect?: (file: File) => void; // ✅ triggers local analysis
  note?: string;
  onUploadError?: (error: string) => void;
  onUploadSuccess?: (url: string, file: File) => void;
}

function createUppyInstance() {
  return new Uppy({
    restrictions: {
      maxNumberOfFiles: 1,
      maxFileSize: 2 * 1024 * 1024,
      allowedFileTypes: [".pdf", "application/pdf"],
    },
    autoProceed: false,
  });
}

export const UppyPDFUploader = forwardRef<
  UppyPDFUploaderHandle,
  UppyPDFUploaderProps
>(({ onFileSelect, onUploadSuccess, onUploadError, note }, ref) => {
  const t = useTranslations("ResumeUploader");
  const [uppy] = useState(() => createUppyInstance());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 🌀 Simulated progress animation (visual only)
  useEffect(() => {
    if (!selectedFile) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 4; // ⬆️ faster increment
      });
    }, 25); // ⬇️ shorter delay
    return () => clearInterval(interval);
  }, [selectedFile]);

  useImperativeHandle(ref, () => ({
    async startUpload() {
      if (!selectedFile) return null;

      // Real upload to S3 only happens here when user confirms
      try {
        const res = await fetch("/api/upload/presigned-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: selectedFile.name,
            contentType: selectedFile.type,
            fileType: "resume",
          }),
        });

        if (!res.ok) throw new Error("Failed to get presigned URL");

        const data = await res.json();

        await fetch(data.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        const publicUrl = data.publicUrl;
        onUploadSuccess?.(publicUrl, selectedFile);
        return publicUrl;
      } catch (err: any) {
        onUploadError?.(err.message || t("uploadFailed"));
        return null;
      }
    },
    clearFile: () => {
      setSelectedFile(null);
      setProgress(0);
      uppy.cancelAll();
      uppy.getFiles().forEach((f: any) => uppy.removeFile(f.id));
    },
    getFile: () => selectedFile,
  }));

  const handleSelectFile = (file: File) => {
    try {
      setSelectedFile(file);
      onFileSelect?.(file); // trigger local scoring
    } catch {
      onUploadError?.(t("invalidFile"));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleSelectFile(f);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setProgress(0);
    uppy.cancelAll();
    uppy.getFiles().forEach((f: any) => uppy.removeFile(f.id));
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          className="flex flex-col items-center justify-center w-full p-12 text-center border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-500 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleChange}
          />
          <p className="text-sm text-muted-foreground">
            {t("dragDrop")} {" "}
            <span className="text-black font-medium">{t("clickToBrowse")}</span>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-4 border rounded-lg p-3 bg-white shadow-sm relative">
          <div className="flex items-center justify-center h-10 w-10 bg-red-600 text-white font-semibold rounded-md">
            PDF
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium text-sm">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {t("addedOn", { date: format(new Date(), "PP") })}
            </p>
            <div className="relative mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "absolute left-0 top-0 h-full bg-gradient-to-r from-black to-black/80 transition-all duration-300 ease-in-out"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Trash2
            className="w-4 h-4 text-gray-500 hover:text-red-600 cursor-pointer"
            onClick={handleRemove}
          />
        </div>
      )}

      {note && (
        <p className="mt-2 text-xs text-muted-foreground text-center">{note}</p>
      )}
    </div>
  );
});

UppyPDFUploader.displayName = "UppyPDFUploader";
