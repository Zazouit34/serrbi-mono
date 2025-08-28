import { z } from 'zod'
import {
  jobCategoryValues,
  locationRequirementValues,
  experienceLevelValues,
  jobListingTypeValues,
} from "@workspace/ui/lib/job-enum"
import { isValidPhoneNumber } from "libphonenumber-js";

export const emailSchema = z.string().email({ message: 'Invalid email address' })

export const emailFormSchema = z.object({
  email: emailSchema,
})
export type emailFormValues = z.infer<typeof emailFormSchema>;


export const tokenSchema = z.string().uuid()

export const tokenFormSchema = z.object({
  token: tokenSchema,
})
export type tokenFormValues = z.infer<typeof tokenFormSchema>;




export const passwordSchema = z
  .string()
  .min(6, { message: "Password must be at least 6 characters long" })
  .superRefine((val, ctx) => {
    if (!/[A-Z]/.test(val)) {
      ctx.addIssue({
        code: "custom",
        message: "Must contain at least one uppercase letter",
      });
    }
    if (!/[0-9]/.test(val)) {
      ctx.addIssue({
        code: "custom",
        message: "Must contain at least one number",
      });
    }
    if (!/[^a-zA-Z0-9]/.test(val)) {
      ctx.addIssue({
        code: "custom",
        message: "Must contain at least one special character",
      });
    }
  });

export const nameSchema = z
  .string()
  .min(2, { message: 'Name must be at least 2 characters long' })

  export const phoneSchema = z.string().refine(
    (val) => isValidPhoneNumber(val),
    { message: "Phone number must be valid" }
  );

export const messageSchema = z
  .string()
  .min(10, { message: 'Message must be at least 10 characters long' })

export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  message: messageSchema,
})

export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
      })
    }
  })

  export type RegisterFormValues = z.infer<typeof registerFormSchema>;


  export const resetPasswordFormSchema = z
  .object({
    token: tokenSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
      })
    }
  })
  export type ressetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;



  // Helper: treat "" as undefined
const emptyToUndefined = z.literal("").transform(() => undefined)

export const jobListingFormSchema = z
  .object({
    title: z.string().min(1, "Required").trim(),
    description: z.string().min(1, "Required").trim(),

    category: z.enum(jobCategoryValues, { required_error: "Required" }),
    locationRequirement: z.enum(locationRequirementValues, { required_error: "Required" }),
    experienceLevel: z.enum(experienceLevelValues, { required_error: "Required" }),
    type: z.enum(jobListingTypeValues, { required_error: "Required" }),

    // Wage: accept number OR numeric string; allow empty -> null
    wage: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return null
      if (typeof val === "string" && val.trim() !== "") return Number(val)
      return val
    }, z.number().int().positive().min(1).nullable().optional()),

    // Optional location bits (US-style state code if you use it)
    stateAbbreviation: z
      .union([z.string().length(2, "Use 2-letter code"), emptyToUndefined])
      .optional(),
    city: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),

    // Apply via email or URL (at least one required below)
    applicationEmail: z.union([z.string().email("Invalid email"), emptyToUndefined]).optional(),
    applicationUrl: z.union([z.string().url("Invalid URL"), emptyToUndefined]).optional(),

    // If you let users set status on creation, include this; otherwise set on backend.
    // status: z.enum(jobListingStatusValues).default("draft"),
  })
  .superRefine((data, ctx) => {
    // Enforce: at least one of email or url
    if (!data.applicationEmail && !data.applicationUrl) {
      ctx.addIssue({
        code: "custom",
        message: "Provide either an application email or an application URL.",
        path: ["applicationEmail"],
      })
      ctx.addIssue({
        code: "custom",
        message: "Provide either an application email or an application URL.",
        path: ["applicationUrl"],
      })
    }
  })

export type JobListingFormValues = z.infer<typeof jobListingFormSchema>