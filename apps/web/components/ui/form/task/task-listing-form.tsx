"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FormError } from "../form-error";
import { FormSuccess } from "../form-success";
import { LoadingSwap } from "../loading-swap";
import { motion, AnimatePresence } from "framer-motion";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Textarea } from "@workspace/ui/components/textarea";

import { trpc } from "@/app/_trpc/client";

import states from "@workspace/ui/lib/states.json";
import { PhoneInput } from "../phone-input";

import {
  taskListingFormSchema,
  type TaskListingFormValues,
} from "@workspace/ui/lib/validation-schemas";
import { taskCategoryValues } from "@workspace/ui/lib/task-enum";
import {
  formatTaskCategory,
  getTaskCategoryGradient,
} from "@workspace/ui/lib/formatter";
import { taskCategoryIcons } from "@/components/ui/config/task-filter-config";
import { Check } from "lucide-react";

const steps = [
  {
    title: "Step 1 – Basics",
    subtitle: "Name, category, and budget",
    icon: "/images/tasks.png",
  },
  {
    title: "Step 2 – Location & Contact",
    subtitle: "Where and how to reach you",
    icon: "/images/services.png",
  },
  {
    title: "Step 3 – Description",
    subtitle: "Describe the task details",
    icon: "/images/Jobs.png",
  },
  {
    title: "Step 4 – Review & Submit",
    subtitle: "Double-check and publish",
    icon: "/images/free.png",
  },
];

export function TaskListingForm() {
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [step, setStep] = useState(0);
  const router = useRouter();

  const MAX_DESCRIPTION_LENGTH = 180;

  const form = useForm<TaskListingFormValues>({
    resolver: zodResolver(taskListingFormSchema) as any,
    defaultValues: {
      description: "",
      category: undefined,
      budget: undefined as unknown as number,
      stateAbbreviation: undefined,
      city: undefined,
      phoneNumber: undefined,
      displayName: undefined,
      deadline: "",
      bgStyle: undefined,
    },
  });

  const createTask = trpc.task.createTask.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message);
      setTimeout(() => {
        router.push("/tasks");
      }, 2000);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  // Watch the category field to update bgStyle automatically
  const selectedCategory = form.watch("category");

  // Update bgStyle when category changes
  useEffect(() => {
    if (selectedCategory) {
      const gradient = getTaskCategoryGradient(selectedCategory);
      form.setValue("bgStyle", gradient);
    } else {
      form.setValue("bgStyle", undefined);
    }
  }, [selectedCategory, form]);

  const getFieldsForStep = (currentStep: number) => {
    switch (currentStep) {
      case 0:
        return ["displayName", "category", "budget"] as const;
      case 1:
        return ["city", "stateAbbreviation", "phoneNumber"] as const;
      case 2:
        return ["description"] as const;
      default:
        return [] as const;
    }
  };

  const nextStep = async () => {
    const fields = getFieldsForStep(step);
    const isValid = await form.trigger(fields as any, { shouldFocus: true });
    if (isValid) setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  async function onSubmit(values: TaskListingFormValues) {
    if (step < steps.length - 1) {
      await nextStep();
      return;
    }
    setSuccess("");
    setError("");
    try {
      await createTask.mutateAsync(values);
    } catch {
      // Error handled by onError
    }
  }

  // Get current gradient for the textarea
  const currentGradient = selectedCategory
    ? getTaskCategoryGradient(selectedCategory)
    : undefined;

  return (
    <div className="flex justify-center items-center mt-5 w-full">
      <div className="w-full">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold font-outfit">
            Create Task Listing
          </h1>
          <p className="text-muted-foreground font-outfit">
            Fill out the form below to create a new task listing.
          </p>
        </div>

        {/* step UI removed */}

        <Form {...form}>
          <form
            onSubmit={(e) => e.preventDefault()}
            onKeyDown={async (e) => {
              // Prevent any Enter-based submission before last step (Ctrl/Cmd included)
              if (step < steps.length - 1 && e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                await nextStep();
              }
            }}
            className="space-y-6"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28 }}
                className="space-y-6"
              >
            {/* STEP 1 */}
            {step === 0 && (
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 items-start md:grid-cols-3">
                <FormField
                  control={form.control as any}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="displayName">Name</FormLabel>
                      <FormControl>
                        <Input
                          id="displayName"
                          placeholder="John Doe"
                          disabled={createTask.isPending}
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
                  name="category"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false);
                    const Icon = field.value
                      ? (taskCategoryIcons as any)[field.value]
                      : null;
                    return (
                      <FormItem>
                        <FormLabel>Task Category</FormLabel>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="justify-between w-full h-11 rounded-full"
                            >
                              {field.value ? (
                                <span className="flex gap-2 items-center">
                                  {Icon && (
                                    <Icon className="w-4 h-4 text-black" />
                                  )}
                                  {formatTaskCategory(field.value as any)}
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  Select category
                                </span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            sideOffset={12}
                            className="rounded-3xl p-6 w-[700px] max-w-[90vw] bg-white shadow-lg border border-gray-100"
                          >
                            <div className="flex flex-wrap justify-center gap-3">
                              {taskCategoryValues.map((category) => {
                                const CatIcon = (taskCategoryIcons as any)[
                                  category
                                ];
                                const isSelected = field.value === category;
                                return (
                                  <Button
                                    key={category}
                                    variant="outline"
                                    size="lg"
                                    className={`flex items-center gap-3 px-6 py-3 rounded-full text-base font-medium transition-colors border ${isSelected ? "border-gray-400 bg-gray-100 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                    onClick={() => {
                                      field.onChange(category);
                                      setOpen(false);
                                    }}
                                  >
                                    {CatIcon && (
                                      <CatIcon
                                        className={`w-5 h-5 ${isSelected ? "text-black" : "text-gray-500"}`}
                                      />
                                    )}
                                    {formatTaskCategory(category)}
                                    {isSelected && (
                                      <Check className="w-4 h-4 text-black" />
                                    )}
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
                  control={form.control as any}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (MAD)</FormLabel>
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
              </div>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 items-start md:grid-cols-3">
                {/* City */}
                <FormField
                  control={form.control as any}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="city">City</FormLabel>
                      <FormControl>
                        <Input
                          id="city"
                          placeholder="Casablanca"
                          disabled={createTask.isPending}
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

                {/* State */}
                <FormField
                  control={form.control as any}
                  name="stateAbbreviation"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false);
                    const stateName = field.value
                      ? (states as any)[field.value]
                      : undefined;
                    return (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="justify-between w-full h-11 rounded-full"
                            >
                              {stateName ? (
                                <span className="font-medium text-black">
                                  {stateName}
                                </span>
                              ) : (
                                <span className="text-gray-500">State</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            sideOffset={12}
                            className="rounded-3xl p-6 w-[700px] max-w-[90vw] bg-white shadow-lg border border-gray-100"
                          >
                            <div className="flex flex-wrap justify-center gap-3 max-h-[320px] overflow-auto">
                              {Object.entries(
                                states as Record<string, string>
                              ).map(([abbr, name]) => {
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
                                    {isSelected && (
                                      <Check className="w-4 h-4 text-black" />
                                    )}
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

                {/* Phone Number */}
                <FormField
                  control={form.control as any}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="phoneNumber">Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          {...field}
                          defaultCountry="MA"
                          international
                          disabled={createTask.isPending}
                          placeholder="+212 6 12 34 56 78"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <FormField
                control={form.control as any}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea
                          placeholder="Describe your quick gig..."
                          value={field.value}
                          onChange={(e) => {
                            const text = e.target.value;
                            if (text.length <= MAX_DESCRIPTION_LENGTH) {
                              field.onChange(text);
                            }
                          }}
                          disabled={createTask.isPending}
                          className={`min-h-[220px] w-full resize-none text-center font-semibold leading-snug rounded-2xl px-6 py-8 transition-all duration-300 ${
                            currentGradient
                              ? "text-white placeholder:text-white/70"
                              : "text-gray-800 placeholder:text-gray-400"
                          }`}
                          style={{
                            background: currentGradient || undefined,
                            fontSize:
                              field.value.length < 40
                                ? "1.75rem"
                                : field.value.length < 90
                                  ? "1.25rem"
                                  : "1rem",
                          }}
                        />

                        {/* character counter */}
                        <div
                          className={`absolute bottom-3 right-4 text-xs ${
                            field.value.length >= MAX_DESCRIPTION_LENGTH * 0.9
                              ? "text-red-300"
                              : currentGradient
                                ? "text-white/70"
                                : "text-gray-400"
                          }`}
                        >
                          {field.value.length}/{MAX_DESCRIPTION_LENGTH}
                        </div>
                      </div>
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* STEP 4 */}
            {step === 3 &&
              (() => {
                const v = form.getValues();
                const gradient = v.category
                  ? getTaskCategoryGradient(v.category as any)
                  : undefined;
                return (
                  <div className="rounded-md border bg-white/60">
                    <div className="p-3 border-b">
                      <h3 className="text-sm font-medium">Review</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Confirm details before creating your task.
                      </p>
                    </div>
                    <div className="p-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="text-sm font-medium break-words">
                          {v.displayName || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Category
                        </p>
                        <p className="text-sm font-medium">
                          {v.category
                            ? formatTaskCategory(v.category as any)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="text-sm font-medium">
                          {v.budget ? `${v.budget} MAD` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">
                          {v.phoneNumber || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="text-sm font-medium">{v.city || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">State</p>
                        <p className="text-sm font-medium">
                          {v.stateAbbreviation || "—"}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Description
                        </p>
                        <div
                          className="rounded-md p-3 text-sm text-white min-h-[80px] whitespace-pre-wrap"
                          style={
                            gradient ? { background: gradient } : undefined
                          }
                        >
                          {v.description || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              </motion.div>
            </AnimatePresence>

            <FormError message={error} />
            <FormSuccess message={success} />

            <div className="flex justify-between">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto bg-black text-white hover:bg-black/80"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={form.handleSubmit(onSubmit)}
                  className="ml-auto bg-black text-white hover:bg-black/80"
                  disabled={createTask.isPending}
                >
                  <LoadingSwap isLoading={createTask.isPending}>
                    Create Task Listing
                  </LoadingSwap>
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
