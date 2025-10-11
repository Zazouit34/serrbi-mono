"use client";

import { useState, useRef } from "react";
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
import { PhoneInput } from "../phone-input";
import { UppyMultiImageUploader, type MultiImageUploaderHandle } from "@/components/ui/uppy-multi-image-uploader";
import { FormError } from "../form-error";
import { FormSuccess } from "../form-success";
import { LoadingSwap } from "../loading-swap";

import {
  serviceListingFormSchema,
  type ServiceListingFormValues,
} from "@workspace/ui/lib/validation-schemas";
import { serviceCategoryValues } from "@workspace/ui/lib/service-enum";
import { formatServiceCategory } from "@workspace/ui/lib/formatter";

const steps = [
  {
    title: "Step 1 – Service Basics",
    subtitle: "Core details — what the service is and how it's priced",
    icon: "/images/services.png",
  },
  {
    title: "Step 2 – Location Info",
    subtitle: "Where the service operates",
    icon: "/images/basic.png",
  },
  {
    title: "Step 3 – Contact & Description",
    subtitle: "How customers contact you and what you provide",
    icon: "/images/premium.png",
  },
  {
    title: "Step 4 – Images & Submit",
    subtitle: "Upload images and publish your listing",
    icon: "/images/free.png",
  },
];

export function ServiceListingForm() {
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [step, setStep] = useState(0);
  const router = useRouter();
  const imagesUploaderRef = useRef<MultiImageUploaderHandle | null>(null);

  const form = useForm<ServiceListingFormValues>({
    resolver: zodResolver(serviceListingFormSchema) as any,
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      title: "",
      description: "",
      serviceCategory: undefined,
      type: "",
      price: 0,
      displayName: undefined,
      displayImage: undefined,
      images: [],
      stateAbbreviation: undefined,
      city: undefined,
      address: undefined,
      phoneNumber: undefined,
      email: undefined,
      website: undefined,
      openingHours: undefined,
    },
  });

  // Watch form values to trigger re-renders for validation
  const watchedValues = form.watch();

  const createService = trpc.service.createService.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message);
      setTimeout(() => {
        router.push("/services");
      }, 1600);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  async function onSubmit(values: ServiceListingFormValues) {
    // Guard: if not on last step, advance instead of submitting
    if (step < steps.length - 1) {
      const fieldsToValidate = getFieldsForStep(step);
      const isValid = await form.trigger(fieldsToValidate, { shouldFocus: true });
      if (isValid) setStep((s) => Math.min(s + 1, steps.length - 1));
      return;
    }
    setSuccess("");
    setError("");
    try {
      if (createService.isPending) return; // prevent duplicates
      // Upload images only on final submit
      const urls = await imagesUploaderRef.current?.startUpload();
      const images = urls ?? [];
      const nextValues = { ...values, images } as ServiceListingFormValues;
      await createService.mutateAsync(nextValues);
    } catch {
      // handled by mutation onError
    }
  }

  if (status === "loading")
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/services/service-listing/new");
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        Redirecting to login...
      </div>
    );
  }

  const getFieldsForStep = (currentStep: number) => {
    switch (currentStep) {
      case 0:
        return ['title', 'serviceCategory', 'type', 'price'] as const;
      case 1:
        return ['city', 'stateAbbreviation', 'address'] as const; // optional per schema, ok if empty
      case 2:
        return ['description', 'phoneNumber', 'email', 'website'] as const;
      default:
        return [] as const;
    }
  };

  const nextStep = async () => {
    // Validate only fields for this step using the Zod schema
    const fieldsToValidate = getFieldsForStep(step);
    const isValid = await form.trigger(fieldsToValidate, { shouldFocus: true });
    if (isValid) {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="flex justify-center items-center space-y-4 w-full md:space-y-8">
      <div className="w-full max-w-3xl">
        {/* header */}
        <div className="flex flex-col justify-center items-center mb-8 text-center">
          <h1 className="text-2xl font-bold font-outfit">Create Service Listing</h1>
          <p className="text-muted-foreground font-outfit">
            Fill out the form below to create a new service listing.
          </p>
        </div>

        {/* progress bar */}
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

        {/* step title */}
        <div className="flex flex-col mb-6 space-y-4">
          <div className="flex gap-3 justify-center items-center">
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
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && step < steps.length - 1) {
                e.preventDefault();
                const fieldsToValidate = getFieldsForStep(step);
                const isValid = await form.trigger(fieldsToValidate, { shouldFocus: true });
                if (isValid) setStep((s) => Math.min(s + 1, steps.length - 1));
              }
            }}
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
                {/* STEP 1: Basics */}
                {step === 0 && (
                  <>
                    {/* Title and Category inline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control as any}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Professional Plumbing Service"
                                {...field}
                                value={field.value ?? ""}
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
                                <SelectTrigger className="w-full">
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
                    </div>

                    {/* Type and Price inline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control as any}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Type</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Plumber, Electrician, Designer..."
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control as any}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (MAD)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="100" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* STEP 2 */}
                {step === 1 && (
                  <>
                    {/* City and State inline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control as any}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                            <Input placeholder="Casablanca" {...field} value={field.value ?? ""} />
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
                              onValueChange={(v) => field.onChange(v || undefined)}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
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
                    </div>

                    {/* Address on its own line */}
                    <FormField
                      control={form.control as any}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main Street" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* STEP 3 */}
                {step === 2 && (
                  <>
                    {/* Phone and Email inline */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control as any}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <PhoneInput
                                {...field}
                                value={field.value ?? ""}
                                defaultCountry="MA"
                                international
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
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="contact@service.com"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Website on its own line */}
                    <FormField
                      control={form.control as any}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://service.com"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Description</FormLabel>
                          <FormControl>
                            <div className="min-h-[260px]">
                              <MarkdownEditor markdown={field.value} {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* STEP 4 */}
                {step === 3 && (
                  <>
                    {/* Gallery Images (required >= 1) */}
                    <FormField
                      control={form.control as any}
                      name="images"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Images</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <UppyMultiImageUploader
                                ref={imagesUploaderRef as any}
                                category="services"
                                maxFiles={6}
                                onChangeCount={(count) => {
                                  // Keep a shadow value to satisfy Zod min(1)
                                  if (count === 0) field.onChange([]);
                                }}
                                onUploadError={(err) => {
                                  setError(err);
                                  setTimeout(() => setError(""), 2500);
                                }}
                                note="Add at least one image • Upload happens on Create"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Removed displayImage field */}

                    <div className="p-3 rounded-md border bg-white/60">
                      <h3 className="text-sm font-medium">Review</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Make sure everything looks correct — title, price,
                        location, and contact info.
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between mt-8">
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
                  className="ml-auto text-white bg-black hover:bg-gray-800"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createService.isPending}
                  className="ml-auto w-44 text-white bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LoadingSwap isLoading={createService.isPending}>
                    Create Service Listing
                  </LoadingSwap>
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
