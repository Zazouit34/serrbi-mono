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
import { PhoneInput } from "../phone-input";

import {
  serviceListingFormSchema,
  type ServiceListingFormValues,
} from "@workspace/ui/lib/validation-schemas";
import {
  serviceCategoryValues,
  priceTypeValues,
} from "@workspace/ui/lib/service-enum";
import {
  formatServiceCategory,
  formatPriceType,
} from "@workspace/ui/lib/formatter";

export function ServiceListingForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const router = useRouter();

  const form = useForm<ServiceListingFormValues>({
    resolver: zodResolver(serviceListingFormSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      serviceCategory: undefined,
      type: "",
      price: 0,
      priceType: undefined,
      stateAbbreviation: undefined,
      city: undefined,
      address: undefined,
      phoneNumber: undefined,
      email: undefined,
      website: undefined,
      openingHours: undefined,
    },
  });

  const createService = trpc.service.createService.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message);
      setTimeout(() => {
        router.push("/services");
      }, 2000);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  async function onSubmit(values: ServiceListingFormValues) {
    setSuccess("");
    setError("");
    startTransition(async () => {
      try {
        await createService.mutateAsync(values);
      } catch {
        // Error handled by onError
      }
    });
  }

  return (
    <div className="flex justify-center items-center mt-5 w-full">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Service Listing</h1>
          <p className="text-muted-foreground">
            Fill out the form below to create a new service listing.
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* First row: Title, Service Category, Type */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 items-start md:grid-cols-3">
              <FormField
                control={form.control as any}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="title">Service Title</FormLabel>
                    <FormControl>
                      <Input
                        id="title"
                        placeholder="Professional Plumbing Service"
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
                name="serviceCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger disabled={isPending} className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceCategoryValues.map((category) => (
                          <SelectItem key={category} value={category}>
                            {formatServiceCategory(category)}
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
                    <FormLabel htmlFor="type">Service Type</FormLabel>
                    <FormControl>
                      <Input
                        id="type"
                        placeholder="Plumber, Dentist, etc."
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price + PriceType fused */}
            <FormItem>
              <FormLabel>Price</FormLabel>
              <div className="flex">
                {/* Price Input */}
                <FormField
                  control={form.control as any}
                  name="price"
                  render={({ field }) => (
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
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

                {/* PriceType Select */}
                <FormField
                  control={form.control as any}
                  name="priceType"
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
                          {priceTypeValues.map((type) => (
                            <SelectItem key={type} value={type}>
                              {formatPriceType(type)}
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

            {/* City, State, Address Row */}
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
                      onValueChange={(val) =>
                        field.onChange(val || undefined)
                      }
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

              {/* Address */}
              <FormField
                control={form.control as any}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="address">Address</FormLabel>
                    <FormControl>
                      <Input
                        id="address"
                        placeholder="123 Main Street"
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
            </div>

            {/* Contact Information Row */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 items-start md:grid-cols-3">
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

              <FormField
                control={form.control as any}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@service.com"
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
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="website">Website</FormLabel>
                    <FormControl>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://service.com"
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
            </div>

            {/* Service Description */}
            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Description</FormLabel>
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
                Create Service Listing
              </LoadingSwap>
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
