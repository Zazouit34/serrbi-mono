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
import { Progress } from "@workspace/ui/components/progress"; // shadcn progress
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
      ...props
    },
    ref
  ) => {
    const [isFileTooBig, setIsFileTooBig] = useState(false);
    const [isLOF, setIsLOF] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const {
      accept = { "application/pdf": [".pdf"] },
      maxFiles = 1,
      maxSize = 5 * 1024 * 1024,
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
      [reSelectAll, value]
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
  const { removeFileFromSet } = useFileUpload();
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

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mt-1 w-full h-1 rounded bg-muted">
            <motion.div
              className="h-1 bg-black rounded"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
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
