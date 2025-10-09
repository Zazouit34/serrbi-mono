"use client";

import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { motion } from "framer-motion";

import {
  Dispatch,
  SetStateAction,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useDropzone,
  DropzoneState,
  FileRejection,
  DropzoneOptions,
} from "react-dropzone";
import { toast } from "sonner";
import { Trash2 as RemoveIcon } from "lucide-react";
import {FaFilePdf} from "react-icons/fa";
import prettyBytes from "pretty-bytes";

type DirectionOptions = "rtl" | "ltr" | undefined;

type FileUploaderContextType = {
  dropzoneState: DropzoneState;
  isLOF: boolean;
  isFileTooBig: boolean;
  removeFileFromSet: (index: number) => void;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  orientation: "horizontal" | "vertical";
  direction: DirectionOptions;
  uploadProgress?: number; // 0..100 (single-file use)
  uploadedUrl?: string | null;
};

const FileUploaderContext = createContext<FileUploaderContextType | null>(null);

export const useFileUpload = () => {
  const context = useContext(FileUploaderContext);
  if (!context) {
    throw new Error("useFileUpload must be used within a FileUploaderProvider");
  }
  return context;
};

type FileUploaderProps = {
  value: File[] | null;
  reSelect?: boolean;
  onValueChange: (value: File[] | null) => void;
  dropzoneOptions: DropzoneOptions;
  orientation?: "horizontal" | "vertical";
  onUploadSuccess?: (url: string, file: File) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: number) => void;
};

export const FileUploader = forwardRef<
  HTMLDivElement,
  FileUploaderProps & React.HTMLAttributes<HTMLDivElement>
>(
  (
    {
      className,
      dropzoneOptions,
      value,
      onValueChange,
      reSelect,
      orientation = "vertical",
      children,
      dir,
      onUploadSuccess,
      onUploadError,
      onUploadProgress,
      ...props
    },
    ref
  ) => {
    const [isFileTooBig, setIsFileTooBig] = useState(false);
    const [isLOF, setIsLOF] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

    const {
      accept = { "application/pdf": [".pdf"] },
      maxFiles = 1,
      maxSize = 2 * 1024 * 1024, // match Uppy (2MB)
      multiple = false,
    } = dropzoneOptions;

    const reSelectAll = maxFiles === 1 ? true : reSelect;
    const direction: DirectionOptions = dir === "rtl" ? "rtl" : "ltr";

    const removeFileFromSet = useCallback(
      (i: number) => {
        if (!value) return;
        const newFiles = value.filter((_, index) => index !== i);
        onValueChange(newFiles);
      },
      [value, onValueChange]
    );

    const startUpload = useCallback(async (file: File) => {
      try {
        setUploadedUrl(null);
        setUploadProgress(0);
        onUploadProgress?.(0);

        // 1) Get presigned URL
        const res = await fetch("/api/upload/presigned-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/pdf",
            fileType: "resume",
          }),
        });
        if (!res.ok) throw new Error("Failed to get presigned URL");
        const data = await res.json();

        // 2) Upload with progress using XHR
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", data.presignedUrl);
          xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(pct);
              onUploadProgress?.(pct);
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(100);
              onUploadProgress?.(100);
              setUploadedUrl(data.publicUrl);
              onUploadSuccess?.(data.publicUrl, file);
              resolve();
            } else {
              const msg = `Upload failed (${xhr.status})`;
              onUploadError?.(msg);
              reject(new Error(msg));
            }
          };
          xhr.onerror = () => {
            onUploadError?.("Network error during upload");
            reject(new Error("Network error during upload"));
          };
          xhr.send(file);
        });
      } catch (err: any) {
        setUploadProgress(undefined);
        setUploadedUrl(null);
        onUploadError?.(err?.message || "Upload failed");
      }
    }, [onUploadError, onUploadProgress, onUploadSuccess]);

    const onDrop = useCallback(
      (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
        const files = acceptedFiles;
        if (!files) {
          toast.error("File error, probably too big");
          return;
        }

        const newValues: File[] = value ? [...value] : [];
        if (reSelectAll) newValues.splice(0, newValues.length);

        files.forEach((file) => {
          if (newValues.length < maxFiles) newValues.push(file);
        });

        onValueChange(newValues);

        // Auto-upload first file (single-file usage)
        const first = newValues[0];
        if (first) {
          void startUpload(first);
        }

        if (rejectedFiles.length > 0) {
          for (let i = 0; i < rejectedFiles.length; i++) {
            if (rejectedFiles[i]?.errors[0]?.code === "file-too-large") {
              toast.error(
                `File is too large. Max size is ${maxSize / 1024 / 1024}MB`
              );
              break;
            }
            if (rejectedFiles[i]?.errors?.[0]?.message) {
              toast.error(rejectedFiles[i]?.errors?.[0]?.message);
              break;
            }
          }
        }
      },
      [reSelectAll, value, startUpload]
    );

    useEffect(() => {
      if (!value) return;
      setIsLOF(value.length === maxFiles);
    }, [value, maxFiles]);

    const opts = dropzoneOptions
      ? dropzoneOptions
      : { accept, maxFiles, maxSize, multiple };

    const dropzoneState = useDropzone({
      ...opts,
      onDrop,
      onDropRejected: () => setIsFileTooBig(true),
      onDropAccepted: () => setIsFileTooBig(false),
    });

    return (
      <FileUploaderContext.Provider
        value={{
          dropzoneState,
          isLOF,
          isFileTooBig,
          removeFileFromSet,
          activeIndex,
          setActiveIndex,
          orientation,
          direction,
          uploadProgress,
          uploadedUrl,
        }}
      >
        <div
          ref={ref}
          className={cn("grid space-y-3 w-full focus:outline-none", className)}
          dir={dir}
          {...props}
        >
          {children}
        </div>
      </FileUploaderContext.Provider>
    );
  }
);

FileUploader.displayName = "FileUploader";

export const FileUploaderContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const { orientation } = useFileUpload();
  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        "flex flex-col gap-3 rounded-md w-full",
        orientation === "horizontal" ? "flex-row flex-wrap" : "flex-col",
        className
      )}
    >
      {children}
    </div>
  );
});

FileUploaderContent.displayName = "FileUploaderContent";

export const FileUploaderItem = forwardRef<
  HTMLDivElement,
  { index: number; progress?: number } & React.HTMLAttributes<HTMLDivElement>
>(({ className, index, children, progress, ...props }, ref) => {
  const { removeFileFromSet, uploadProgress } = useFileUpload();
  return (
    <div
      ref={ref}
      className={cn(
        "flex relative gap-3 items-center p-3 rounded-lg border shadow-sm bg-card",
        className
      )}
      {...props}
    >
      {/* PDF Icon */}
      <FaFilePdf className="text-red-500 size-6 shrink-0" />

      {/* File info */}
      <div className="flex-1">
        <div className="text-sm font-medium truncate">{children}</div>
        <div className="text-xs text-muted-foreground">
          {"data-size" in props && props["data-size"]
            ? prettyBytes(props["data-size"] as number)
            : ""}
        </div>

        {/* Progress bar: prefer live uploadProgress, fallback to provided prop */}
        {((uploadProgress ?? progress) !== undefined) && (
          <div className="mt-1 w-full h-1 rounded bg-muted">
            <motion.div
              className="h-1 bg-black rounded"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress ?? progress}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => removeFileFromSet(index)}
        className="transition text-muted-foreground hover:text-destructive"
      >
        <RemoveIcon className="w-5 h-5" />
      </button>
    </div>
  );
});

FileUploaderItem.displayName = "FileUploaderItem";

export const FileInput = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { dropzoneState, isFileTooBig, isLOF } = useFileUpload();
  const rootProps = isLOF ? {} : dropzoneState.getRootProps();
  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        "relative w-full cursor-pointer border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground transition",
        dropzoneState.isDragAccept
          ? "border-green-500 bg-green-50"
          : dropzoneState.isDragReject || isFileTooBig
            ? "border-red-500 bg-red-50"
            : "border-gray-300 hover:bg-muted/30",
        isLOF && "opacity-50 cursor-not-allowed",
        className
      )}
      {...rootProps}
    >
      <Input
        ref={dropzoneState.inputRef}
        disabled={isLOF}
        {...dropzoneState.getInputProps()}
        className="hidden"
      />
      {children ?? (
        <p className="text-sm font-medium">Click or drag a PDF to upload</p>
      )}
    </div>
  );
});

FileInput.displayName = "FileInput";
