"use client";

import { useState, useRef } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";

interface UppyImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
  category: "jobs" | "services";
  maxFiles?: number;
  allowedFileTypes?: string[];
  note?: string;
}

function createUppyImageUploader(
  category: "jobs" | "services",
  maxFiles: number,
  allowedFileTypes: string[],
  onUploadSuccess: (url: string) => void,
  onUploadError?: (error: string) => void
) {
  const uppy = new Uppy({
    restrictions: {
      maxNumberOfFiles: maxFiles,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedFileTypes,
    },
    autoProceed: true,
  });

  // Store public URLs for files
  const publicUrls = new Map<string, string>();

  uppy.use(AwsS3, {
    async getUploadParameters(file) {
      try {
        const response = await fetch("/api/upload/presigned-url", {
          method: "POST",
          credentials: "include", // Include cookies for authentication
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileType: "image",
            category,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to get upload URL");
        }

        const data = await response.json();
        
        // Store public URL for later use
        if (file.id) {
          publicUrls.set(file.id, data.publicUrl);
        }

        return {
          method: "PUT",
          url: data.presignedUrl,
          headers: {
            "Content-Type": file.type!,
          },
          fields: {},
        };
      } catch (error) {
        console.error("Error getting presigned URL:", error);
        throw error;
      }
    },
  });

  // Handle successful uploads
  uppy.on("upload-success", async (file, response) => {
    if (file?.id) {
      const publicUrl = publicUrls.get(file.id);
      if (publicUrl) {
        onUploadSuccess(publicUrl);
        publicUrls.delete(file.id);
      } else {
        onUploadError?.("Failed to retrieve file URL");
      }
    }
  });

  // Handle upload errors
  uppy.on("upload-error", (file, error) => {
    console.error("Upload error:", error);
    onUploadError?.(error.message || "Upload failed");
  });

  return uppy;
}

export function UppyImageUploader({
  onUploadSuccess,
  onUploadError,
  category,
  maxFiles = 1,
  allowedFileTypes = [".jpg", ".jpeg", ".png", ".webp"],
  note,
}: UppyImageUploaderProps) {
  const [uppy] = useState(() => 
    createUppyImageUploader(category, maxFiles, allowedFileTypes, onUploadSuccess, onUploadError)
  );
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  uppy.on("file-added", (file) => {
    setSelectedFile(file.name);
    setUploading(true);
  });

  uppy.on("upload-success", () => {
    setUploading(false);
  });

  uppy.on("upload-error", () => {
    setUploading(false);
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        uppy.addFile({
          name: files[0].name,
          type: files[0].type,
          data: files[0],
        });
      } catch (err) {
        console.error("Error adding file:", err);
        onUploadError?.("Failed to add file");
      }
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
    if (files && files.length > 0) {
      try {
        uppy.addFile({
          name: files[0].name,
          type: files[0].type,
          data: files[0],
        });
      } catch (err) {
        console.error("Error adding file:", err);
        onUploadError?.("Failed to add file");
      }
    }
  };

  const acceptTypes = allowedFileTypes.join(",");

  return (
    <div className="w-full">
      <div 
        className={`flex flex-col items-center justify-center w-full p-12 text-center border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-400 hover:border-gray-500'
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
          accept={acceptTypes}
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-sm text-muted-foreground">
          Drag & drop your image here, or{" "}
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

