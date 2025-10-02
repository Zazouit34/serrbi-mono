"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FormError } from "../form-error";
import { FormSuccess } from "../form-success";
import { LoadingSwap } from "../loading-swap";

import {
  Form,
  FormControl,
  FormDescription,
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
import keywordsByCategory from "@workspace/ui/data/auto-apply-keyword.json";
import { Tags, TagsTrigger, TagsValue, TagsContent, TagsInput, TagsList, TagsEmpty, TagsGroup, TagsItem } from "@workspace/ui/components/ui/shadcn-io/tags";

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

export function JobListingForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const router = useRouter();

  const form = useForm<JobListingFormValues>({
    resolver: zodResolver(jobListingFormSchema) as any,
    defaultValues: {
      title: "",
      companyName: "",
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
        // Error handled by onError
      }
    });
  }

  return (
    <div className="flex justify-center items-center space-y-4 w-full md:space-y-8">
      <div className="w-full">
        <div className="flex flex-col justify-center items-center mb-6">
          <h1 className="text-2xl font-bold font-outfit">Create Job Listing</h1>
          <p className="text-muted-foreground font-outfit">
            Fill out the form below to create a new job listing.
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* First row: Title, Company Name, Wage, Category, Tags */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 items-start md:grid-cols-5">
              <FormField
                control={form.control as any}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="title">Job Title</FormLabel>
                    <FormControl>
                      <Input
                        id="title"
                        placeholder="Software Engineer"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="companyName">Company Name</FormLabel>
                    <FormControl>
                      <Input
                        id="companyName"
                        placeholder="Company Name"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="wage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="wage">Wage (Annual)</FormLabel>
                    <FormControl>
                      <Input
                        id="wage"
                        type="number"
                        placeholder="50000"
                        disabled={isPending}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger
                          disabled={isPending}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jobCategoryValues.map((category) => (
                          <SelectItem key={category} value={category}>
                            {formatJobCategory(category)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags selector bound to form tags */}
              <FormField
                control={form.control as any}
                name="tags"
                render={({ field }) => {
                  const currentCategory = (form.getValues() as any).category as string | undefined;
                  const suggestions: string[] = currentCategory ? (keywordsByCategory as any)[currentCategory] ?? [] : [];
                  const [tagInput, setTagInput] = useState("");
                  const addTag = (t: string) => {
                    if (!t) return;
                    const next = Array.from(new Set([...(field.value ?? []), t]));
                    field.onChange(next);
                    setTagInput("");
                  };
                  const removeTag = (t: string) => {
                    const next = (field.value ?? []).filter((k: string) => k !== t);
                    field.onChange(next);
                  };
                  return (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <div>
                          <Tags value={tagInput} setValue={setTagInput} className="w-full">
                            <TagsTrigger>
                              {(field.value ?? []).map((k: string) => (
                                <TagsValue key={k} onRemove={() => removeTag(k)}>
                                  {k}
                                </TagsValue>
                              ))}
                            </TagsTrigger>
                            <TagsContent>
                              <TagsInput placeholder="Search tags..." />
                              <TagsList>
                                <TagsEmpty>No tags found.</TagsEmpty>
                                <TagsGroup heading="Suggestions">
                                  {suggestions
                                    .filter((s) => !(field.value ?? []).includes(s))
                                    .map((s) => (
                                      <TagsItem key={s} onSelect={() => addTag(s)}>
                                        {s}
                                      </TagsItem>
                                    ))}
                                </TagsGroup>
                              </TagsList>
                            </TagsContent>
                          </Tags>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            {/* Second row: City, State, Location, Job Type, Experience */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 items-start md:grid-cols-5">
              <FormField
                control={form.control as any}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="city">City</FormLabel>
                    <FormControl>
                      <Input
                        id="city"
                        placeholder="New York"
                        disabled={isPending}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="stateAbbreviation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(val) =>
                        field.onChange(val || undefined)
                      }
                    >
                      <FormControl>
                        <SelectTrigger
                          disabled={isPending}
                          className="w-full"
                        >
                          <SelectValue placeholder="State" />
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

              <FormField
                control={form.control as any}
                name="locationRequirement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Requirement</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger
                          disabled={isPending}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select location type" />
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
                control={form.control as any}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger
                          disabled={isPending}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jobListingTypeValues.map((type) => (
                          <SelectItem key={type} value={type}>
                            {formatJobType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="experienceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience Level</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger
                          disabled={isPending}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {experienceLevelValues.map((level) => (
                          <SelectItem key={level} value={level}>
                            {formatExperienceLevel(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Application Email and URL Row */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 items-start md:grid-cols-2">
              <FormField
                control={form.control as any}
                name="applicationEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="applicationEmail">
                      Application Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="applicationEmail"
                        type="email"
                        placeholder="jobs@company.com"
                        disabled={isPending}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || undefined)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Where candidates should send applications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="applicationUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="applicationUrl">
                      Application URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="applicationUrl"
                        type="url"
                        placeholder="https://company.com/apply"
                        disabled={isPending}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || undefined)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Alternative to email - application portal URL
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Description */}
            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description</FormLabel>
                  <FormControl>
                    <div className="min-h-[320px]">
                      <MarkdownEditor markdown={field.value} {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormError message={error} />
            <FormSuccess message={success} />

            <Button type="submit" className="w-full">
              <LoadingSwap isLoading={isPending}>
                Create Job Listing
              </LoadingSwap>
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
