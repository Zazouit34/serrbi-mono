"use client";

import { useState, useTransition, useEffect } from "react";
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
import {
  taskCategoryValues,
  taskStatusValues,
  BudgetTypeValues,
} from "@workspace/ui/lib/task-enum";
import {
  formatTaskCategory,
  formatBudgetType,
  getTaskCategoryGradient,
} from "@workspace/ui/lib/formatter";

export function TaskListingForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const router = useRouter();

  const form = useForm<TaskListingFormValues>({
    resolver: zodResolver(taskListingFormSchema) as any,
    defaultValues: {
      description: "",
      category: undefined,
      budget: 0,
      budgetType: undefined,
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

  async function onSubmit(values: TaskListingFormValues) {
    setSuccess("");
    setError("");
    startTransition(async () => {
      try {
        await createTask.mutateAsync(values);
      } catch {
        // Error handled by onError
      }
    });
  }

  // Get current gradient for the textarea
  const currentGradient = selectedCategory ? getTaskCategoryGradient(selectedCategory) : undefined;

  return (
    <div className="flex justify-center items-center mt-5 w-full">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Task Listing</h1>
          <p className="text-muted-foreground">
            Fill out the form below to create a new task listing.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* First row: Display Name, Category, Budget */}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger disabled={isPending} className="w-full">
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

              {/* Budget + BudgetType fused */}
              <FormItem>
                <FormLabel>Budget (MAD)</FormLabel>
                <div className="flex">
                  {/* Budget Input */}
                  <FormField
                    control={form.control as any}
                    name="budget"
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="500"
                          disabled={isPending}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          className="rounded-r-none"
                        />
                      </FormControl>
                    )}
                  />

                  {/* BudgetType Select */}
                  <FormField
                    control={form.control as any}
                    name="budgetType"
                    render={({ field }) => (
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            disabled={isPending}
                            className="rounded-l-none w-[140px]"
                          >
                            <SelectValue placeholder="/ type" />
                          </SelectTrigger>
                          <SelectContent>
                            {BudgetTypeValues.map((type) => (
                              <SelectItem key={type} value={type}>
                                {formatBudgetType(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    )}
                  />
                </div>
                <FormMessage />
              </FormItem>
            </div>

            {/* Second row: City, State, Phone Number */}
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
                        <SelectTrigger disabled={isPending} className="w-full">
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
                        disabled={isPending}
                        placeholder="+212 6 12 34 56 78"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Task Description with Category-based Gradient */}
            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Description</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Preview with gradient background */}
                      {currentGradient && field.value && (
                        <div
                          className="flex justify-center items-center p-4 w-full rounded-md transition-all min-h-[100px] text-lg font-bold text-center text-white"
                          style={{
                            background: currentGradient,
                          }}
                        >
                          {field.value}
                        </div>
                      )}
                      
                      {/* Simple textarea */}
                      <Textarea
                        placeholder="Describe your task in detail..."
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isPending}
                        className="min-h-[200px] resize-none"
                      />
                      
                      {selectedCategory && (
                        <p className="text-sm text-muted-foreground">
                          ✨ Your task will display with a beautiful {formatTaskCategory(selectedCategory)} gradient background
                        </p>
                      )}
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
                Create Task Listing
              </LoadingSwap>
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
