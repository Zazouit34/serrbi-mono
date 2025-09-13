"use client";
import React from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { ImagePlus, X, Upload } from "lucide-react";
import { toast } from "sonner";

interface MultiImageUploaderProps {
  onImagesUpload: (files: File[]) => void;
  onImagesSubmit?: (files: File[]) => void; // New: called when submit is pressed
  onImageRemove?: (index: number) => void;
  onAllImagesRemove?: () => void;
  initialImageUrls?: string[];
  label?: string;
  className?: string;
  maxImages?: number;
}

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({
  onImagesUpload,
  onImagesSubmit,
  onImageRemove,
  onAllImagesRemove,
  initialImageUrls = [],
  label = "Upload Images",
  className = "",
  maxImages = 4,
}) => {
  const [previews, setPreviews] = React.useState<string[]>(initialImageUrls);
  const [files, setFiles] = React.useState<File[]>([]);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      // Check if adding new files would exceed max limit
      const totalFiles = files.length + acceptedFiles.length;
      if (totalFiles > maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      // Process files for preview
      const newFiles = [...files, ...acceptedFiles];
      const newPreviews = [...previews];

      let processedCount = 0;
      acceptedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          newPreviews.push(result);
          processedCount++;
          
          if (processedCount === acceptedFiles.length) {
            setPreviews(newPreviews);
            setFiles(newFiles);
            setIsSubmitted(false); // Reset submitted state
            onImagesUpload(newFiles);
          }
        };
        reader.readAsDataURL(file);
      });

      toast.success(`${acceptedFiles.length} image(s) selected`);
    },
    [files, previews, maxImages, onImagesUpload],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      maxFiles: maxImages - files.length,
      maxSize: 1000000,
      accept: { 
        "image/png": [], 
        "image/jpg": [], 
        "image/jpeg": [], 
        "image/webp": [] 
      },
      multiple: true,
    });

  const handleRemoveImage = (index: number) => {
    console.log(`🗑️ Removing image at index ${index}`);
    const newPreviews = previews.filter((_, i) => i !== index);
    const newFiles = files.filter((_, i) => i !== index);
    
    setPreviews(newPreviews);
    setFiles(newFiles);
    setIsSubmitted(false); // Reset submitted state
    onImageRemove?.(index);
    onImagesUpload(newFiles);
  };

  const handleRemoveAll = () => {
    console.log("🗑️ Removing all images");
    setPreviews([]);
    setFiles([]);
    setIsSubmitted(false);
    onAllImagesRemove?.();
    onImagesUpload([]);
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      toast.error("No images to upload");
      return;
    }

    // 🔍 DETAILED CONSOLE LOGGING FOR S3 BATCH UPLOAD SIMULATION
    console.log("=== MULTI IMAGE UPLOAD SUBMIT ===");
    console.log("📁 Files to upload:", files);
    console.log("📝 Files details:");
    
    files.forEach((file, index) => {
      console.log(`File ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        lastModifiedDate: new Date(file.lastModified),
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
      });
    });

    // 🚀 What would be sent to S3 API for batch upload
    const formDataForS3 = new FormData();
    files.forEach((file, index) => {
      formDataForS3.append(`files`, file);
      formDataForS3.append(`file_${index}_metadata`, JSON.stringify({
        originalName: file.name,
        index: index,
        timestamp: Date.now(),
      }));
    });
    formDataForS3.append('folder', 'uploads/batch');
    formDataForS3.append('batch_id', `batch_${Date.now()}`);
    formDataForS3.append('total_files', files.length.toString());
    formDataForS3.append('upload_type', 'batch_images');
    
    console.log("🌐 FormData that would be sent to /api/upload-batch:", {
      entries: Array.from(formDataForS3.entries()),
      filesCount: files.length,
      folder: formDataForS3.get('folder'),
      batchId: formDataForS3.get('batch_id'),
    });

    // 📱 Future S3 batch upload structure
    const s3BatchUpload = {
      batchId: `batch_${Date.now()}`,
      totalFiles: files.length,
      files: files.map((file, index) => ({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        bucketPath: `uploads/batch/${Date.now()}-${index}-${file.name}`,
        index: index,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          batchId: `batch_${Date.now()}`,
          order: index,
        }
      })),
      totalSize: files.reduce((acc, f) => acc + f.size, 0),
      totalSizeMB: (files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2),
    };
    
    console.log("📤 Future S3 batch upload structure:", s3BatchUpload);
    console.log("📊 Upload summary:", {
      fileNames: files.map(f => f.name),
      totalFiles: files.length,
      totalSizeMB: s3BatchUpload.totalSizeMB,
      avgFileSizeMB: (parseFloat(s3BatchUpload.totalSizeMB) / files.length).toFixed(2),
    });

    setIsSubmitted(true);
    onImagesSubmit?.(files);
    toast.success(`${files.length} images ready for batch upload! ✨`);
  };

  return (
    <div className={`space-y-4 max-w-2xl ${className}`}>
      {label && (
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">{label}</label>
          <span className="text-xs text-muted-foreground">
            {files.length}/{maxImages} images
            {isSubmitted && <span className="ml-2 text-green-600">✓ Ready</span>}
          </span>
        </div>
      )}
      
      {/* Upload Area */}
      {files.length < maxImages && !isSubmitted && (
        <div
          {...getRootProps()}
          className={`
            relative cursor-pointer rounded-lg border-2 border-dashed p-6 transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${fileRejections.length > 0 ? 'border-destructive' : ''}
          `}
        >
          <Input {...getInputProps()} type="file" className="hidden" />
          
          <div className="flex flex-col justify-center items-center space-y-2 text-center">
            <ImagePlus className="w-8 h-8 text-muted-foreground" />
            <div className="space-y-1">
              {isDragActive ? (
                <p className="text-sm text-foreground">Drop the images here!</p>
              ) : (
                <>
                  <p className="text-sm text-foreground">
                    Click to upload or drag and drop multiple images
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, JPEG, WebP (max 1MB each, up to {maxImages} images)
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Selected Images</h4>
            {previews.length > 1 && !isSubmitted && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveAll}
              >
                Remove All
              </Button>
            )}
          </div>
          
          <div className={`grid grid-cols-2 gap-3 ${isSubmitted ? 'opacity-75' : ''}`}>
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="object-cover w-full h-32 rounded-md border"
                />
                {!isSubmitted && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 p-0 w-6 h-6 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
                <div className="absolute bottom-1 left-1 px-1 text-xs text-white rounded bg-black/50">
                  {index + 1}
                </div>
                {isSubmitted && (
                  <div className="absolute top-1 right-1 px-1 text-xs text-white bg-green-500 rounded">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      {files.length > 0 && !isSubmitted && (
        <Button 
          onClick={handleSubmit}
          className="w-full"
          size="sm"
        >
          <Upload className="mr-2 w-4 h-4" />
          Submit {files.length} Image{files.length > 1 ? 's' : ''} for Upload
        </Button>
      )}

      {isSubmitted && (
        <div className="p-3 text-sm text-center text-green-700 bg-green-50 rounded">
          ✅ {files.length} images submitted for batch upload
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-3"
            onClick={() => setIsSubmitted(false)}
          >
            Edit Selection
          </Button>
        </div>
      )}

      {fileRejections.length > 0 && (
        <div className="space-y-1">
          {fileRejections.map((rejection, index) => (
            <p key={index} className="text-sm text-destructive">
              {rejection.file.name}: {rejection.errors[0]?.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};