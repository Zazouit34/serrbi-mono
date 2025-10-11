"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { trpc } from "@/app/_trpc/client";

import { StateSelectItems } from "../state-select";
import { PhoneInput } from "../phone-input";

import {
  taskListingFormSchema,
  type TaskListingFormValues,
} from "@workspace/ui/lib/validation-schemas";
import { taskCategoryValues, taskStatusValues } from "@workspace/ui/lib/task-enum";
import { formatTaskCategory, getTaskCategoryGradient } from "@workspace/ui/lib/formatter";

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

  const form = useForm<TaskListingFormValues>({
    resolver: zodResolver(taskListingFormSchema) as any,
    defaultValues: {
      description: "",
      category: undefined,
      budget: 0,
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
  const currentGradient = selectedCategory ? getTaskCategoryGradient(selectedCategory) : undefined;

  return (
    <div className="flex justify-center items-center mt-5 w-full">
      <div className="w-full">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold font-outfit">Create Task Listing</h1>
          <p className="text-muted-foreground font-outfit">Fill out the form below to create a new task listing.</p>
        </div>

        {/* progress bar */}
        <div className="flex justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className={`flex-1 h-2 mx-1 rounded-full transition-all ${i <= step ? "bg-black" : "bg-gray-300"}`} />
          ))}
        </div>

        {/* step header */}
        <div className="flex gap-3 justify-center items-center mb-6">
          <div className="w-10 h-10">
            <img src={steps[step]?.icon} alt={steps[step]?.title} className="object-contain w-full h-full" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{steps[step]?.title}</h2>
            <p className="text-sm text-gray-500">{steps[step]?.subtitle}</p>
          </div>
        </div>

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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger disabled={createTask.isPending} className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taskCategoryValues.map((category) => (
                            <SelectItem key={category} value={category}>
                              {formatTaskCategory(category)}
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
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (MAD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="500"
                          disabled={createTask.isPending}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(val) => field.onChange(val || undefined)}
                    >
                      <FormControl>
                        <SelectTrigger disabled={createTask.isPending} className="w-full">
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
                      <Textarea
                        placeholder="Describe your task in detail..."
                        value={field.value}
                        onChange={field.onChange}
                        disabled={createTask.isPending}
                        className="min-h-[220px] resize-none text-white placeholder:text-white/80 !font-semibold !text-[1.05rem] md:!text-[1.05rem] leading-6"
                        style={currentGradient ? { background: currentGradient } : undefined}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {/* STEP 4 */}
            {step === 3 && (
              (() => {
                const v = form.getValues();
                const gradient = v.category ? getTaskCategoryGradient(v.category as any) : undefined;
                return (
                  <div className="rounded-md border bg-white/60">
                    <div className="p-3 border-b">
                      <h3 className="text-sm font-medium">Review</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Confirm details before creating your task.</p>
                    </div>
                    <div className="p-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="text-sm font-medium break-words">{v.displayName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Category</p>
                        <p className="text-sm font-medium">{v.category ? formatTaskCategory(v.category as any) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="text-sm font-medium">{v.budget ? `${v.budget} MAD` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{v.phoneNumber || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="text-sm font-medium">{v.city || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">State</p>
                        <p className="text-sm font-medium">{v.stateAbbreviation || "—"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-muted-foreground">Description</p>
                        <div
                          className="rounded-md p-3 text-sm text-white min-h-[80px] whitespace-pre-wrap"
                          style={gradient ? { background: gradient } : undefined}
                        >
                          {v.description || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

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
                <Button type="button" onClick={nextStep} className="ml-auto bg-black text-white hover:bg-black/80">
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={form.handleSubmit(onSubmit)}
                  className="ml-auto bg-black text-white hover:bg-black/80"
                  disabled={createTask.isPending}
                >
                  <LoadingSwap isLoading={createTask.isPending}>Create Task Listing</LoadingSwap>
            </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
