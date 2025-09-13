"use client";
import React from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { ImagePlus, X, Upload } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  onImageUpload: (file: File | null) => void;
  onImageSubmit?: (file: File | null) => void; // New: called when submit is pressed
  initialImageUrl?: string;
  label?: string;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  onImageSubmit,
  initialImageUrl,
  label = "Upload Image",
  className = "",
}) => {
  const [preview, setPreview] = React.useState<string>(initialImageUrl || "");
  const [currentFile, setCurrentFile] = React.useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      try {
        reader.onload = () => {
          const result = reader.result as string;
          setPreview(result);
          setCurrentFile(file);
          setIsSubmitted(false); // Reset submitted state
          onImageUpload(file);
        };
        reader.readAsDataURL(file);
        toast.success(`Image selected: ${file.name}`);
      } catch (error) {
        console.error("❌ Error processing file:", error);
        setPreview("");
        setCurrentFile(null);
        toast.error("Failed to process image");
      }
    },
    [onImageUpload],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      maxFiles: 1,
      maxSize: 1000000,
      accept: { 
        "image/png": [], 
        "image/jpg": [], 
        "image/jpeg": [], 
        "image/webp": [] 
      },
    });

  const handleRemoveImage = () => {
    console.log("🗑️ Removing image");
    setPreview("");
    setCurrentFile(null);
    setIsSubmitted(false);
    onImageUpload(null);
  };

  const handleSubmit = () => {
    if (!currentFile) {
      toast.error("No image to upload");
      return;
    }

    // 🔍 DETAILED CONSOLE LOGGING FOR S3 UPLOAD SIMULATION
    console.log("=== IMAGE UPLOAD SUBMIT ===");
    console.log("📁 File to upload:", currentFile);
    console.log("📝 File details:", {
      name: currentFile.name,
      size: currentFile.size,
      type: currentFile.type,
      lastModified: currentFile.lastModified,
      lastModifiedDate: new Date(currentFile.lastModified),
    });
    console.log("📊 File size in MB:", (currentFile.size / (1024 * 1024)).toFixed(2));
    
    // 🚀 What would be sent to S3 API
    const formDataForS3 = new FormData();
    formDataForS3.append('file', currentFile);
    formDataForS3.append('folder', 'uploads/single');
    formDataForS3.append('timestamp', Date.now().toString());
    formDataForS3.append('upload_type', 'single_image');
    
    console.log("🌐 FormData that would be sent to /api/upload:", {
      entries: Array.from(formDataForS3.entries()),
      file: formDataForS3.get('file'),
      folder: formDataForS3.get('folder'),
      timestamp: formDataForS3.get('timestamp'),
    });

    // 📱 Future S3 upload simulation
    console.log("📤 Future S3 upload data:", {
      fileName: currentFile.name,
      contentType: currentFile.type,
      fileSize: currentFile.size,
      bucketPath: `uploads/single/${Date.now()}-${currentFile.name}`,
      metadata: {
        originalName: currentFile.name,
        uploadedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }
    });

    setIsSubmitted(true);
    onImageSubmit?.(currentFile);
    toast.success(`Image ready for upload: ${currentFile.name} ✨`);
  };

  return (
    <div className={`space-y-3 max-w-sm ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}
      
      <div
        {...getRootProps()}
        className={`
          relative cursor-pointer rounded-lg border-2 border-dashed p-6 transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${fileRejections.length > 0 ? 'border-destructive' : ''}
          ${isSubmitted ? 'border-green-500 bg-green-50' : ''}
        `}
      >
        <Input {...getInputProps()} type="file" className="hidden" />
        
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="object-cover mx-auto max-h-48 rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 p-0 w-6 h-6 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
            >
              <X className="w-3 h-3" />
            </Button>
            {isSubmitted && (
              <div className="absolute top-2 left-2 px-2 py-1 text-xs text-white bg-green-500 rounded">
                ✓ Ready
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center space-y-2 text-center">
            <ImagePlus className="w-8 h-8 text-muted-foreground" />
            <div className="space-y-1">
              {isDragActive ? (
                <p className="text-sm text-foreground">Drop the image here!</p>
              ) : (
                <>
                  <p className="text-sm text-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, JPEG, WebP (max 1MB)
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      {currentFile && !isSubmitted && (
        <Button 
          onClick={handleSubmit}
          className="w-full"
          size="sm"
        >
          <Upload className="mr-2 w-4 h-4" />
          Submit for Upload
        </Button>
      )}

      {isSubmitted && (
        <div className="p-2 text-sm text-center text-green-700 bg-green-50 rounded">
          ✅ Image submitted for upload
        </div>
      )}

      {fileRejections.length > 0 && (
        <p className="text-sm text-destructive">
          {fileRejections[0]?.errors[0]?.message || 
           "Image must be less than 1MB and of type PNG, JPG, JPEG, or WebP"}
        </p>
      )}
    </div>
  );
};
