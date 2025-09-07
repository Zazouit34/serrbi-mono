"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import { useForm } from "react-hook-form";
import { CloudUpload, Paperclip, ArrowLeft } from "lucide-react";
import {
  FileInput,
  FileUploader,
  FileUploaderContent,
  FileUploaderItem,
} from "./file-input";
import { FormSuccess } from "../form-success";
import { FormError } from "../form-error";
import { LoadingSwap } from "../loading-swap";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  jobApplyFormSchema,
  type JobApplyFormValues,
} from "@workspace/ui/lib/validation-schemas";

export function JobApplyForm({
  jobId,
  jobTitle,
}: {
  jobId: string;
  jobTitle: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const [cvFile, setCvFile] = useState<File | null>(null);
  const form = useForm<JobApplyFormValues>({
    resolver: zodResolver(jobApplyFormSchema),
    defaultValues: { name: "", email: "" },
  });

  const submitApplicationMutation = trpc.job.submitApplication.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message);
      setTimeout(() => {
        router.push("/jobs");
      }, 2000);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  async function onSubmit(values: JobApplyFormValues) {
    setSuccess("");
    setError("");
    startTransition(async () => {
      try {
        let cvData: string | undefined;
        let cvFilename: string | undefined;

        if (cvFile) {
          cvData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(",")[1];
              resolve(base64 as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(cvFile);
          });
          cvFilename = cvFile.name;
        }

        await submitApplicationMutation.mutateAsync({
          jobId,
          jobTitle,
          name: values.name,
          email: values.email,
          cv: !!cvFile,
          cvData,
          cvFilename,
        });
      } catch {
        // handled in onError
      }
    });
  }

  const dropZoneConfig = {
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
    multiple: false,
    maxSize: 5 * 1024 * 1024,
  };

  return (
    <div className="flex flex-col py-8 w-full">
      {!showForm ? (
        <div className="flex relative items-center w-full">
          {/* Back button aligned left */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex absolute left-0 gap-1"
          >
            <ArrowLeft className="size-5" />
          </Button>

          {/* Apply button centered */}
          <div className="flex flex-1 justify-center">
            <Button className="w-48" onClick={() => setShowForm(true)}>
              Apply
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center w-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 space-y-6 w-full max-w-xl" // 👈 removed bg-white, rounded-xl, shadow-md
            >
              {/* Inline fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane Doe"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jane@mail.com"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* CV Upload */}
              <FormField
                control={form.control}
                name="cv"
                render={() => (
                  <FormItem>
                    <FormLabel>CV upload (PDF or Word)</FormLabel>
                    <FormControl>
                      <FileUploader
                        value={cvFile ? [cvFile] : []}
                        onValueChange={(files) => {
                          const f = files?.[0] ?? null;
                          setCvFile(f);
                          form.setValue("cv", f as any, {
                            shouldValidate: true,
                          });
                        }}
                        dropzoneOptions={dropZoneConfig}
                        className="relative p-2 rounded-lg"
                      >
                        <FileInput className="outline-dashed outline-1 outline-slate-500">
                          <div className="flex flex-col justify-center items-center p-8 w-full">
                            <CloudUpload className="w-10 h-10 text-gray-500" />
                            <p className="mb-1 text-sm text-gray-500">
                              <span className="font-semibold">
                                Click to upload
                              </span>{" "}
                              or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                              Accepted: PDF, DOC, DOCX • Max 5MB
                            </p>
                          </div>
                        </FileInput>
                        <FileUploaderContent>
                          {cvFile && (
                            <FileUploaderItem index={0}>
                              <Paperclip className="w-4 h-4 stroke-current" />
                              <span>{cvFile.name}</span>
                            </FileUploaderItem>
                          )}
                        </FileUploaderContent>
                      </FileUploader>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormError message={error} />
              <FormSuccess message={success} />

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  <LoadingSwap isLoading={isPending}>
                    Submit Application
                  </LoadingSwap>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
