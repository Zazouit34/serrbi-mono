"use client";

import { useState, useRef, useEffect } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";

interface UppyPDFUploaderProps {
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
  note?: string;
}

function createUppyPDFUploader(
  onUploadSuccess: (url: string) => void,
  onUploadError?: (error: string) => void
) {
  // typed as `any` to avoid some overly strict Uppy plugin typings in TS
  const uppy: any = new Uppy({
    restrictions: {
      maxNumberOfFiles: 1,
      maxFileSize: 2 * 1024 * 1024, // 2MB
      allowedFileTypes: [".pdf", "application/pdf"],
    },
    autoProceed: true,
  });

  // map file.id -> public URL returned by your server
  const publicUrls = new Map<string, string>();

  // Use AwsS3 plugin. Cast to `any` to avoid TypeScript mismatch between AwsS3
  // options shape and the project's @uppy types (this does not change runtime).
  uppy.use(AwsS3 as any, {
    // when Uppy wants to upload a file, it calls getUploadParameters(file)
    // we call our server route to get a presigned PUT URL and a publicUrl
    getUploadParameters: async (file: any) => {
      try {
        const response = await fetch("/api/upload/presigned-url", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/pdf",
            fileType: "resume",
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to get upload URL");
        }

        const data = await response.json();

        // store public url to emit it later when upload-success fires
        if (file?.id && data?.publicUrl) {
          publicUrls.set(file.id, data.publicUrl);
        }

        return {
          // Uppy expects method/url/fields (for form uploads). Using PUT to the presigned URL.
          method: "PUT",
          url: data.presignedUrl,
          fields: {},
          headers: {
            // put the content type; fallback to pdf if missing
            "Content-Type": file.type || "application/pdf",
          },
        };
      } catch (err: any) {
        console.error("Error getting presigned URL:", err);
        throw err;
      }
    },
  });

  // When Uppy reports upload-success, read the publicUrl we stored earlier
  uppy.on("upload-success", (file: any) => {
    try {
      if (!file?.id) {
        onUploadError?.("Upload succeeded but missing file id");
        return;
      }
      const publicUrl = publicUrls.get(file.id);
      if (publicUrl) {
        onUploadSuccess(publicUrl);
        publicUrls.delete(file.id);
      } else {
        onUploadError?.("Failed to retrieve public URL for uploaded file");
      }
    } catch (err: any) {
      console.error("Error in upload-success handler:", err);
      onUploadError?.(err?.message || "Unknown upload success handling error");
    }
  });

  uppy.on("upload-error", (file: any, error: any) => {
    console.error("Upload error:", error);
    onUploadError?.(error?.message || "Upload failed");
  });

  return uppy;
}

export function UppyPDFUploader({
  onUploadSuccess,
  onUploadError,
  note,
}: UppyPDFUploaderProps) {
  // create uppy once
  const [uppy] = useState<any>(() =>
    createUppyPDFUploader(onUploadSuccess, onUploadError)
  );

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // register lightweight UI-related listeners here and clean up on unmount
  useEffect(() => {
    const handleFileAdded = (file: any) => {
      setSelectedFile(file?.name || null);
      setUploading(true);
    };

    const handleSuccess = () => {
      setUploading(false);
    };

    const handleError = () => {
      setUploading(false);
    };

    uppy.on("file-added", handleFileAdded);
    uppy.on("upload-success", handleSuccess);
    uppy.on("upload-error", handleError);

    return () => {
      uppy.off("file-added", handleFileAdded);
      uppy.off("upload-success", handleSuccess);
      uppy.off("upload-error", handleError);
      // close Uppy instance to release resources
      try {
        uppy.close();
      } catch (err) {
        // ignore close errors
      }
    };
  }, [uppy]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      uppy.addFile({
        name: files[0]?.name,
        type: files[0]?.type,
        data: files[0],
      });
    } catch (err) {
      console.error("Error adding file:", err);
      onUploadError?.("Failed to add file");
    } finally {
      // reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    try {
      uppy.addFile({
        name: files[0]?.name,
        type: files[0]?.type,
        data: files[0],
      });
    } catch (err) {
      console.error("Error adding file:", err);
      onUploadError?.("Failed to add file");
    }
  };

  return (
    <div className="w-full">
      <div
        className={`flex flex-col items-center justify-center w-full p-12 text-center border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-400 hover:border-gray-500"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-sm text-muted-foreground">
          Drag & drop your PDF here, or{" "}
          <span className="text-black font-medium">click to browse</span>
        </p>
        {selectedFile && (
          <p className="mt-2 text-xs text-green-600">
            {uploading ? `Uploading: ${selectedFile}...` : `Selected: ${selectedFile}`}
          </p>
        )}
      </div>
      {note && (
        <p className="mt-2 text-xs text-muted-foreground text-center">{note}</p>
      )}
    </div>
  );
}
