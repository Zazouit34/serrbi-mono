"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { trpc } from "@/app/_trpc/client";
import { MarkdownEditor } from "@/components/ui/markdown/markdown-editor";
import { StateSelectItems } from "../state-select";
import { UppyImageUploader } from "@/components/ui/uppy-image-uploader";
import { FormError } from "../form-error";
import { FormSuccess } from "../form-success";
import { LoadingSwap } from "../loading-swap";

import {
  jobListingFormSchema,
  type JobListingFormValues,
} from "@workspace/ui/lib/validation-schemas";
import {
  jobCategoryValues,
  locationRequirementValues,
  experienceLevelValues,
  jobListingTypeValues,
} from "@workspace/ui/lib/job-enum";
import {
  formatJobCategory,
  formatLocationRequirement,
  formatExperienceLevel,
  formatJobType,
} from "@workspace/ui/lib/formatter";

import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";
import {
  Tags,
  TagsTrigger,
  TagsValue,
  TagsContent,
  TagsInput,
  TagsList,
  TagsEmpty,
  TagsGroup,
  TagsItem,
} from "@workspace/ui/components/ui/shadcn-io/tags";

const steps = [
  {
    title: "Step 1 – Job Basics",
    subtitle: "The essentials — what job, where, and by who",
    icon: "/images/Jobs.png",
  },
  {
    title: "Step 2 – Job Details",
    subtitle: "Information about experience, work mode, salary",
    icon: "/images/free.png",
  },
  {
    title: "Step 3 – Description & Tags",
    subtitle: "Content and keywords for better SEO and discoverability",
    icon: "/images/tasks.png",
  },
  {
    title: "Step 4 – Application Info",
    subtitle: "Where applicants should apply",
    icon: "/images/basic.png",
  },
];

export function JobListingForm() {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [step, setStep] = useState(0);
  const router = useRouter();

  const form = useForm<JobListingFormValues>({
    resolver: zodResolver(jobListingFormSchema) as any,
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      title: "",
      companyName: "",
      companyImage: undefined,
      description: "",
      category: undefined,
      locationRequirement: undefined,
      experienceLevel: undefined,
      type: undefined,
      tags: [],
      wage: null,
      stateAbbreviation: undefined,
      city: undefined,
      applicationEmail: undefined,
      applicationUrl: undefined,
    },
  });

  // Watch form values to trigger re-renders for validation
  const watchedValues = form.watch();

  const createJob = trpc.job.createJob.useMutation({
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

  async function onSubmit(values: JobListingFormValues) {
    setSuccess("");
    setError("");
    startTransition(async () => {
      try {
        await createJob.mutateAsync(values);
      } catch {
        // handled by onError
      }
    });
  }

  if (status === "loading")
    return (
      <div className="flex justify-center items-center min-h-[400px]">
         <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/jobs/job-listing/new");
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        Redirecting to login...
      </div>
    );
  }

  const nextStep = async () => {
    // Validate only fields for this step using the Zod schema
    const fieldsToValidate = getFieldsForStep(step);
    const isValid = await form.trigger(fieldsToValidate, { shouldFocus: true });
    if (isValid) {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }
  };

  const getFieldsForStep = (currentStep: number) => {
    switch (currentStep) {
      case 0:
        return ['title', 'companyName', 'category', 'type'] as const;
      case 1:
        return ['experienceLevel', 'locationRequirement', 'wage'] as const; // wage optional per schema
      case 2:
        return ['description', 'tags'] as const;
      default:
        return [] as const;
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="flex justify-center items-center space-y-4 w-full md:space-y-8">
      <div className="w-full max-w-3xl">
        {/* === HEADER === */}
        <div className="flex flex-col justify-center items-center mb-8 text-center">
          <h1 className="text-2xl font-bold font-outfit">Create Job Listing</h1>
          <p className="text-muted-foreground font-outfit">
            Fill out the form below to create a new job listing.
          </p>
        </div>

        {/* === PROGRESS PILLS === */}
        <div className="flex justify-between mb-10">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`flex-1 h-2 mx-1 rounded-full transition-all ${
                i <= step ? "bg-black" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* === STEP CONTENT === */}
        <div className="flex flex-col mb-6 space-y-4">
          <div className="flex gap-2 justify-center items-center">
            <div className="flex-shrink-0 w-12 h-12">
              <img 
                src={steps[step]?.icon} 
                alt={steps[step]?.title} 
                className="object-contain w-full h-full"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{steps[step]?.title}</h2>
              <p className="text-sm text-gray-500">{steps[step]?.subtitle}</p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* STEP 1 */}
                {step === 0 && (
                  <>
                    {/* Title and Company Name inline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Software Engineer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Company Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Category and Type inline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Category</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full"  >
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {jobCategoryValues.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {formatJobCategory(c)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Type</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full" >
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {jobListingTypeValues.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {formatJobType(t)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="companyImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Logo</FormLabel>
                          <FormControl>
                            <UppyImageUploader
                              category="jobs"
                              onUploadSuccess={(url) => field.onChange(url)}
                              note="Upload a logo up to 5 MB"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* STEP 2 */}
                {step === 1 && (
                  <>
                    {/* Wage and Experience Level inline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control as any}
                        name="wage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wage (Annual)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="50000"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="experienceLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Experience Level</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {experienceLevelValues.map((lvl) => (
                                  <SelectItem key={lvl} value={lvl}>
                                    {formatExperienceLevel(lvl)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Location Requirement, City and State inline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="locationRequirement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Requirement</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {locationRequirementValues.map((loc) => (
                                  <SelectItem key={loc} value={loc}>
                                    {formatLocationRequirement(loc)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="stateAbbreviation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <StateSelectItems />
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* STEP 3 */}
                {step === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <div className="min-h-[200px]">
                              <MarkdownEditor
                                markdown={field.value}
                                {...field}
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => {
                        const [tagInput, setTagInput] = useState("");
                        const category = form.watch("category");
                        const suggestions = category
                          ? ((keywordsByCategory as any)[category] ?? [])
                          : [];
                        const addTag = (t: string) => {
                          if (!t) return;
                          const next = Array.from(
                            new Set([...(field.value ?? []), t])
                          );
                          field.onChange(next);
                          setTagInput("");
                        };
                        const removeTag = (t: string) => {
                          const next = (field.value ?? []).filter(
                            (k: string) => k !== t
                          );
                          field.onChange(next);
                        };
                        return (
                          <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <Tags value={tagInput} setValue={setTagInput}>
                              <TagsTrigger>
                                {(field.value ?? []).map((k: string) => (
                                  <TagsValue
                                    key={k}
                                    onRemove={() => removeTag(k)}
                                  >
                                    {k}
                                  </TagsValue>
                                ))}
                              </TagsTrigger>
                              <TagsContent>
                                <TagsInput placeholder="Add tags..." />
                                <TagsList>
                                  <TagsEmpty>No tags found.</TagsEmpty>
                                  <TagsGroup heading="Suggestions">
                                    {suggestions
                                      .filter(
                                        (s: string) =>
                                          !(field.value ?? []).includes(s)
                                      )
                                      .map((s: string) => (
                                        <TagsItem
                                          key={s}
                                          onSelect={() => addTag(s)}
                                        >
                                          {s}
                                        </TagsItem>
                                      ))}
                                  </TagsGroup>
                                </TagsList>
                              </TagsContent>
                            </Tags>
                          </FormItem>
                        );
                      }}
                    />
                  </>
                )}

                {/* STEP 4 */}
                {step === 3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="applicationEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Application Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="jobs@company.com"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="applicationUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Application URL</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://company.com/apply"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between mt-10">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Back
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button
                  type="button"
                  className="ml-auto text-white bg-black hover:bg-gray-800"
                  onClick={nextStep}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="ml-auto w-40 text-white bg-black hover:bg-gray-800"
                >
                  <LoadingSwap isLoading={isPending}>Submit</LoadingSwap>
                </Button>
              )}
            </div>

            <FormError message={error} />
            <FormSuccess message={success} />
          </form>
        </Form>
      </div>
    </div>
  );
}
