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
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
// Selects removed in favor of Popover pickers

import { trpc } from "@/app/_trpc/client";
import { MarkdownEditor } from "@/components/ui/markdown/markdown-editor";
import states from "@workspace/ui/lib/states.json";
import cities from "@workspace/ui/lib/cities.json" assert { type: "json" };
import { useTranslations } from "next-intl";
import { UppyImageUploader } from "@/components/ui/uppy-image-uploader";
import { FormError } from "../form-error";
import { FormSuccess } from "../form-success";
import { LoadingSwap } from "../loading-swap";

import {
  jobListingFormSchema,
  type JobListingFormValues,
} from "@workspace/ui/lib/validation-schemas";
import { jobCategoryValues, locationRequirementValues, experienceLevelValues, jobListingTypeValues } from "@workspace/ui/lib/job-enum";
import { formatJobCategory, formatLocationRequirement, formatExperienceLevel, formatJobType } from "@workspace/ui/lib/formatter";
import { jobCategoryIcons } from "@/components/ui/config/job-filters-config";
import { Check } from "lucide-react";

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
  const tAll = useTranslations();
  const tJob = useTranslations("JobForm");
  const tForm = useTranslations("Form");
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
      wage: undefined as unknown as number,
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
          <h1 className="text-2xl font-bold font-outfit">{tJob("headingTitle")}</h1>
          <p className="text-muted-foreground font-outfit">
            {tJob("headingSubtitle")}
          </p>
        </div>

        {/* step UI removed */}

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
                            <FormLabel>{tForm("title")}</FormLabel>
                            <FormControl>
                              <Input placeholder={tForm("placeholders.jobTitle")} {...field} />
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
                            <FormLabel>{tForm("companyName")}</FormLabel>
                            <FormControl>
                              <Input placeholder={tForm("placeholders.companyName")} {...field} />
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
                        render={({ field }) => {
                          const [open, setOpen] = useState(false);
                          const Icon = field.value ? (jobCategoryIcons as any)[field.value] : null;
                          return (
                            <FormItem>
                              <FormLabel>{tForm("category")}</FormLabel>
                              <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" className="justify-between w-full h-11 rounded-full">
                                    {field.value ? (
                                      <span className="flex gap-2 items-center">
                                        {Icon && <Icon className="w-4 h-4 text-black" />}
                                        {tAll.has?.("Enums.JobCategory." + field.value) ? tAll("Enums.JobCategory." + field.value) : formatJobCategory(field.value as any)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">{tForm("selectCategory")}</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="center" sideOffset={12} className="rounded-3xl p-6 w-[700px] max-w-[90vw] bg-white shadow-lg border border-gray-100">
                                  <div className="flex flex-wrap justify-center gap-3">
                                    {jobCategoryValues.map((c) => {
                                      const CatIcon = (jobCategoryIcons as any)[c];
                                      const isSelected = field.value === c;
                                      return (
                                        <Button
                                          key={c}
                                          variant="outline"
                                          size="lg"
                                          className={`flex items-center gap-3 px-6 py-3 rounded-full text-base font-medium transition-colors border ${isSelected ? "border-gray-400 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                          onClick={() => {
                                            field.onChange(c);
                                            setOpen(false);
                                          }}
                                        >
                                          {CatIcon && <CatIcon className={`w-5 h-5 ${isSelected ? "text-black" : "text-gray-500"}`} />}
                                          {tAll.has?.("Enums.JobCategory." + c) ? tAll("Enums.JobCategory." + c) : formatJobCategory(c as any)}
                                          {isSelected && <Check className="w-4 h-4 text-black" />}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => {
                          const [open, setOpen] = useState(false);
                          return (
                            <FormItem>
                              <FormLabel>{tForm("jobType")}</FormLabel>
                              <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" className="justify-between w-full h-11 rounded-full">
                                    {field.value ? (
                                      <span className="font-medium text-black">{tAll.has?.("Enums.JobType." + field.value) ? tAll("Enums.JobType." + field.value) : formatJobType(field.value as any)}</span>
                                    ) : (
                                      <span className="text-gray-500">{tForm("selectType")}</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="center" sideOffset={12} className="rounded-3xl p-6 w-[700px] max-w-[90vw] bg-white shadow-lg border border-gray-100">
                                  <div className="flex flex-wrap justify-center gap-3">
                                    {jobListingTypeValues.map((t) => {
                                      const isSelected = field.value === t;
                                      return (
                                        <Button
                                          key={t}
                                          variant="outline"
                                          size="lg"
                                          className={`flex items-center gap-3 px-6 py-3 rounded-full text-base font-medium transition-colors border ${isSelected ? "border-gray-400 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                          onClick={() => {
                                            field.onChange(t);
                                            setOpen(false);
                                          }}
                                        >
                                          {tAll.has?.("Enums.JobType." + t) ? tAll("Enums.JobType." + t) : formatJobType(t as any)}
                                          {isSelected && <Check className="w-4 h-4 text-black" />}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
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
                                inputMode="numeric"
                                min={1}
                                placeholder="100"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="experienceLevel"
                        render={({ field }) => {
                          const [open, setOpen] = useState(false);
                          return (
                            <FormItem>
                              <FormLabel>{tForm("experienceLevel")}</FormLabel>
                              <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" className="justify-between w-full h-11 rounded-full">
                                    {field.value ? (
                                      <span className="font-medium text-black">{tAll.has?.("Enums.ExperienceLevel." + field.value) ? tAll("Enums.ExperienceLevel." + field.value) : formatExperienceLevel(field.value as any)}</span>
                                    ) : (
                                      <span className="text-gray-500">{tForm("selectLevel")}</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="center" sideOffset={12} className="rounded-3xl p-6 w-[700px] max-w-[90vw] bg-white shadow-lg border border-gray-100">
                                  <div className="flex flex-wrap justify-center gap-3">
                                    {experienceLevelValues.map((lvl) => {
                                      const isSelected = field.value === lvl;
                                      return (
                                        <Button
                                          key={lvl}
                                          variant="outline"
                                          size="lg"
                                          className={`flex items-center gap-3 px-6 py-3 rounded-full text-base font-medium transition-colors border ${isSelected ? "border-gray-400 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                          onClick={() => {
                                            field.onChange(lvl);
                                            setOpen(false);
                                          }}
                                        >
                                          {tAll.has?.("Enums.ExperienceLevel." + lvl) ? tAll("Enums.ExperienceLevel." + lvl) : formatExperienceLevel(lvl as any)}
                                          {isSelected && <Check className="w-4 h-4 text-black" />}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    {/* Location Requirement, City and State inline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="locationRequirement"
                        render={({ field }) => {
                          const [open, setOpen] = useState(false);
                          return (
                            <FormItem>
                              <FormLabel>{tForm("locationRequirement")}</FormLabel>
                              <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" className="justify-between w-full h-11 rounded-full">
                                    {field.value ? (
                                      <span className="font-medium text-black">{tAll.has?.("Enums.LocationRequirement." + field.value) ? tAll("Enums.LocationRequirement." + field.value) : formatLocationRequirement(field.value as any)}</span>
                                    ) : (
                                      <span className="text-gray-500">{tForm("selectLocation")}</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="center" sideOffset={12} className="rounded-3xl p-6 w-[700px] max-w-[90vw] bg-white shadow-lg border border-gray-100">
                                  <div className="flex flex-wrap justify-center gap-3">
                                    {locationRequirementValues.map((loc) => {
                                      const isSelected = field.value === loc;
                                      return (
                                        <Button
                                          key={loc}
                                          variant="outline"
                                          size="lg"
                                          className={`flex items-center gap-3 px-6 py-3 rounded-full text-base font-medium transition-colors border ${isSelected ? "border-gray-400 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                          onClick={() => {
                                            field.onChange(loc);
                                            setOpen(false);
                                          }}
                                        >
                                          {tAll.has?.("Enums.LocationRequirement." + loc) ? tAll("Enums.LocationRequirement." + loc) : formatLocationRequirement(loc as any)}
                                          {isSelected && <Check className="w-4 h-4 text-black" />}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => {
                          const [open, setOpen] = useState(false);
                          const displayCity = field.value ? (tAll.has?.("Cities." + field.value) ? tAll("Cities." + field.value) : field.value) : undefined;
                          return (
                            <FormItem>
                              <FormLabel>{tForm("city")}</FormLabel>
                              <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" className="justify-between w-full h-11 rounded-full">
                                    {displayCity ? (
                                      <span className="font-medium text-black">{displayCity}</span>
                                    ) : (
                                      <span className="text-gray-500">{tForm("selectCity")}</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="center" sideOffset={12} className="rounded-3xl p-6 w-[700px] max-w-[90vw] bg-white shadow-lg border border-gray-100">
                                  <div className="flex flex-wrap justify-center gap-3 max-h-[320px] overflow-auto">
                                    {(cities as string[]).map((name) => {
                                      const isSelected = field.value === name;
                                      const label = tAll.has?.("Cities." + name) ? tAll("Cities." + name) : name;
                                      return (
                                        <Button
                                          key={name}
                                          variant="outline"
                                          size="lg"
                                          className={`flex items-center gap-3 px-6 py-3 rounded-full text-base font-medium transition-colors border ${isSelected ? "border-gray-400 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                          onClick={() => {
                                            field.onChange(name);
                                            setOpen(false);
                                          }}
                                        >
                                          {label}
                                          {isSelected && <Check className="w-4 h-4 text-black" />}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="stateAbbreviation"
                        render={({ field }) => {
                          const [open, setOpen] = useState(false);
                          const stateName = field.value ? (states as any)[field.value] : undefined;
                          return (
                            <FormItem>
                              <FormLabel>{tForm("state")}</FormLabel>
                              <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" className="justify-between w-full h-11 rounded-full">
                                    {stateName ? (
                                      <span className="font-medium text-black">{stateName}</span>
                                    ) : (
                                      <span className="text-gray-500">{tForm("selectState")}</span>
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="center" sideOffset={12} className="rounded-3xl p-6 w-[700px] max-w-[90vw] bg-white shadow-lg border border-gray-100">
                                  <div className="flex flex-wrap justify-center gap-3 max-h-[320px] overflow-auto">
                                    {Object.entries(states as Record<string, string>).map(([abbr, name]) => {
                                      const isSelected = field.value === abbr;
                                      return (
                                        <Button
                                          key={abbr}
                                          variant="outline"
                                          size="lg"
                                          className={`flex items-center gap-3 px-6 py-3 rounded-full text-base font-medium transition-colors border ${isSelected ? "border-gray-400 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                          onClick={() => {
                                            field.onChange(abbr);
                                            setOpen(false);
                                          }}
                                        >
                                          {name}
                                          {isSelected && <Check className="w-4 h-4 text-black" />}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
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
                  {tForm("back")}
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button
                  type="button"
                  className="ml-auto text-white bg-black hover:bg-gray-800"
                  onClick={nextStep}
                >
                  {tForm("next")}
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="ml-auto w-40 text-white bg-black hover:bg-gray-800"
                >
                  <LoadingSwap isLoading={isPending}>{tForm("submit")}</LoadingSwap>
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
