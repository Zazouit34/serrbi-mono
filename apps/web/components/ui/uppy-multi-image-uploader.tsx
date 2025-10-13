"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTranslations } from "next-intl";
import Uppy from "@uppy/core";
import AwsS3, { type AwsS3UploadParameters } from "@uppy/aws-s3";
import { Trash2 } from "lucide-react";

type UploadCategory = "jobs" | "services";

export interface MultiImageUploaderHandle {
  startUpload: () => Promise<string[]>; // returns public URLs
  clearAll: () => void;
  removeAt: (index: number) => void;
  getFiles: () => File[];
}

interface MultiImageUploaderProps {
  category: UploadCategory;
  maxFiles?: number;
  note?: string;
  onChangeCount?: (count: number) => void;
  onUploadError?: (error: string) => void;
}

export const UppyMultiImageUploader = forwardRef<
  MultiImageUploaderHandle,
  MultiImageUploaderProps
>(
  (
    { category, maxFiles = 6, note, onChangeCount, onUploadError },
    ref
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const tForm = useTranslations("Form");
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    // Uppy instance (deferred uploads)
    const publicUrls = useRef<Map<string, string>>(new Map());
    const uppyRef = useRef(() => {
      const uppy = new Uppy({ autoProceed: false, allowMultipleUploadBatches: true });
      uppy.use(AwsS3, {
        shouldUseMultipart: false,
        async getUploadParameters(file): Promise<AwsS3UploadParameters> {
          const res = await fetch("/api/upload/presigned-url", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              fileType: "image",
              category,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to get upload URL");
          }
          const data = await res.json();
          if (file.id) publicUrls.current.set(file.id as string, data.publicUrl);
          return {
            method: "PUT",
            url: data.presignedUrl,
            fields: {},
            headers: { "Content-Type": (file.type as string) || "application/octet-stream" },
          };
        },
      });
      uppy.on("upload-error", (_file, error) => {
        onUploadError?.(error?.message || "Upload failed");
      });
      return uppy;
    });
    const uppy = useRef<ReturnType<typeof uppyRef.current> | null>(null);
    if (uppy.current == null) uppy.current = (uppyRef.current as any)();

    useImperativeHandle(ref, () => ({
      async startUpload() {
        if (files.length === 0) return [];
        setUploading(true);
        try {
          // Trigger Uppy upload for all added files
          const result = await (uppy.current as any).upload();
          // Collect public URLs mapped by file ids
          const urls: string[] = [];
          for (const successful of result.successful as any[]) {
            const id = successful.id as string;
            const url = publicUrls.current.get(id);
            if (url) urls.push(url);
          }
          return urls;
        } catch (e: any) {
          onUploadError?.(e?.message || "Upload failed");
          return [];
        } finally {
          setUploading(false);
        }
      },
      clearAll() {
        previews.forEach((p) => URL.revokeObjectURL(p));
        setFiles([]);
        setPreviews([]);
      },
      removeAt(index: number) {
        setFiles((prev) => {
          const next = prev.slice();
          next.splice(index, 1);
          return next;
        });
        setPreviews((prev) => {
          const next = prev.slice();
          const [removed] = next.splice(index, 1);
          if (removed) URL.revokeObjectURL(removed);
          return next;
        });
      },
      getFiles() {
        return files;
      },
    }));

    const addFiles = (selected: FileList | null) => {
      if (!selected || selected.length === 0) return;
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      const next: File[] = [];
      const nextPreviews: string[] = [];
      for (let i = 0; i < selected.length; i++) {
        const f = selected.item(i)!;
        if (!allowed.includes(f.type)) continue;
        next.push(f);
        nextPreviews.push(URL.createObjectURL(f));
        if (files.length + next.length >= maxFiles) break;
      }
      if (next.length > 0) {
        setFiles((prev) => {
          const merged = [...prev, ...next].slice(0, maxFiles);
          return merged;
        });
        setPreviews((prev) => [...prev, ...nextPreviews].slice(0, maxFiles));
        // Add to Uppy queue
        next.forEach((f) => {
          try {
            (uppy.current as any).addFile({ name: f.name, type: f.type, data: f });
          } catch (err) {
            onUploadError?.("Failed to add file");
          }
        });
      }
    };

    // Notify parent of count changes AFTER commit to avoid setState in render
    useEffect(() => {
      onChangeCount?.(files.length);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files.length]);

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      // reset to allow re-selecting same file(s)
      e.currentTarget.value = "";
    };

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      addFiles(e.dataTransfer.files);
    };

    return (
      <div className="w-full">
        <div
          className="p-4 text-center rounded-md border-2 border-dashed cursor-pointer hover:border-gray-500"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onInputChange}
          />
          <p className="text-sm text-muted-foreground">
            {tForm.has?.("dragDropImage") ? tForm("dragDropImage") : "Drag & drop images here, or "}
            <span className="font-medium text-black">{tForm.has?.("clickToBrowse") ? tForm("clickToBrowse") : "click to browse"}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{tForm.has?.("uploadImagesNote") ? tForm("uploadImagesNote") : `Up to ${maxFiles} images • JPG, PNG, WEBP • 5MB each`}</p>
        </div>

        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-3 md:grid-cols-6">
            {previews.map((src, idx) => (
              <div key={src} className="relative group">
                <img src={src} alt="Preview" className="object-cover w-full h-24 rounded" />
                <button
                  type="button"
                  className="absolute top-1 right-1 h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700"
                  aria-label="Remove image"
                  onClick={() => {
                    // local remove to avoid ref indirection
                    (uppy.current as any)?.removeFile?.( (uppy.current as any).getFiles?.()[idx]?.id );
                    setFiles((prev) => {
                      const next = prev.slice();
                      next.splice(idx, 1);
                      return next;
                    });
                    setPreviews((prev) => {
                      const next = prev.slice();
                      const [removed] = next.splice(idx, 1);
                      if (removed) URL.revokeObjectURL(removed);
                      return next;
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {note && <p className="mt-2 text-xs text-center text-muted-foreground">{note}</p>}
        {uploading && (
          <p className="mt-2 text-xs text-muted-foreground">Uploading images...</p>
        )}
      </div>
    );
  }
);

UppyMultiImageUploader.displayName = "UppyMultiImageUploader";


