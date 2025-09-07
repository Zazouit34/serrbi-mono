import { z } from 'zod'
import {
  jobCategoryValues,
  locationRequirementValues,
  experienceLevelValues,
  jobListingTypeValues
} from "@workspace/ui/lib/job-enum"
import { serviceCategoryValues, priceTypeValues } from "@workspace/ui/lib/service-enum"
import { taskCategoryValues, taskStatusValues } from "@workspace/ui/lib/task-enum"
import { isValidPhoneNumber } from "libphonenumber-js";

export const emailSchema = z.string().email({ message: 'Invalid email address' })

export const urlSchema = z.string().url({ message: 'Invalid URL' }).optional()

// Add the opening hours schema
const openingHoursSchema = z.array(
  z.object({
    day: z.string(),
    open: z.string(),  // "09:00"
    close: z.string()  // "19:00"
  })
);

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
    companyName: z.string().min(1, "Required").trim(),
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
    applicationEmail: emailSchema,
    applicationUrl: urlSchema,

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

// Job list/query schema (pagination)
export const jobListQuerySchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(10),
  locationRequirement: z.enum(locationRequirementValues).optional(),
  category: z.enum(jobCategoryValues).optional(),
  experienceLevel: z.enum(experienceLevelValues).optional(),
  type: z.enum(jobListingTypeValues).optional(),
  search: z.string().optional(),
  city: z.string().optional(),
})
export type JobListQueryValues = z.infer<typeof jobListQuerySchema>

//get job by id by alidation schema 
export const jobGetByIdSchema = z.object({ id: z.string().uuid() })
export type JobGetByIdValues = z.infer<typeof jobGetByIdSchema>

//CV File Schema 
export const fileSchema = z.custom<File>(
  (val) => typeof File !== "undefined" && val instanceof File,
  "CV is required"
)
export const jobApplyFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  cv: fileSchema,
})
export type JobApplyFormValues = z.infer<typeof jobApplyFormSchema>

//Job Application Schema
export const jobApplicationCreateSchema = z.object({
  jobId: z.string().uuid(),
  jobTitle: z.string().min(1, "Job title is required"),
  name: nameSchema,
  email: emailSchema,
  cv: z.boolean().default(false),
  cvFilename: z.string().optional(),
  cvData: z.string().optional(),
})
export type JobApplicationCreateValues = z.infer<typeof jobApplicationCreateSchema>

// Service schemas
export const serviceListingFormSchema = z
  .object({
    title: z.string().min(1, "Required").trim(),
    description: z.string().min(1, "Required").trim(),
    serviceCategory: z.enum(serviceCategoryValues, { required_error: "Required" }),
    type: z.string().min(1, "Required").trim(), // subtype like "Dentist", "Plumber"
    price: z.number().int().positive().min(1, "Price must be at least 1"),
    priceType: z.enum(priceTypeValues, { required_error: "Required" }),

     // Display information
     displayName: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
     displayImage: z.union([z.string().url("Invalid URL"), emptyToUndefined]).optional(),
    
    // Location
    stateAbbreviation: z
      .union([z.string().length(2, "Use 2-letter code"), emptyToUndefined])
      .optional(),
    city: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
    address: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),

    // Contact information
    phoneNumber: phoneSchema,
    email: emailSchema,
    website: urlSchema,

    // Opening hours
    openingHours: openingHoursSchema.optional(),
  })


export type ServiceListingFormValues = z.infer<typeof serviceListingFormSchema>

// Service list/query schema (pagination)
export const serviceListQuerySchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(10),
  serviceCategory: z.enum(serviceCategoryValues).optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  stateAbbreviation: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  priceType: z.enum(priceTypeValues).optional(),
})
export type ServiceListQueryValues = z.infer<typeof serviceListQuerySchema>

// Get service by id validation schema
export const serviceGetByIdSchema = z.object({ id: z.string().uuid() })
export type ServiceGetByIdValues = z.infer<typeof serviceGetByIdSchema>



// Task schemas
export const taskListingFormSchema = z
  .object({
    title: z.string().min(1, "Required").trim(),
    description: z.string().min(1, "Required").trim(),
    category: z.enum(taskCategoryValues, { required_error: "Required" }),
    
    // Budget: accept number OR numeric string; allow empty -> null
    budget: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return null
      if (typeof val === "string" && val.trim() !== "") return Number(val)
      return val
    }, z.number().int().positive().min(1).nullable().optional()),

    // Location
    stateAbbreviation: z
      .union([z.string().length(2, "Use 2-letter code"), emptyToUndefined])
      .optional(),
    city: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
    address: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),

    // Contact information
    phoneNumber: phoneSchema,
    email: emailSchema,

    // Display information
    displayName: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
    displayImage: z.union([z.string().url("Invalid URL"), emptyToUndefined]).optional(),
    
    // Deadline
    deadline: z.string().min(1, "Deadline is required"), // ISO date string

    // Images
    images: z.array(z.string()).default([]).optional(),
  })

export type TaskListingFormValues = z.infer<typeof taskListingFormSchema>

// Task list/query schema (pagination)
export const taskListQuerySchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(10),
  category: z.enum(taskCategoryValues).optional(),
  status: z.enum(taskStatusValues).optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  stateAbbreviation: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
})
export type TaskListQueryValues = z.infer<typeof taskListQuerySchema>

// Get task by id validation schema
export const taskGetByIdSchema = z.object({ id: z.string().uuid() })
export type TaskGetByIdValues = z.infer<typeof taskGetByIdSchema>