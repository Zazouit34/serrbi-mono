import { z } from 'zod'
import {
  jobCategoryValues,
  locationRequirementValues,
  experienceLevelValues,
  jobListingTypeValues
} from "@workspace/ui/lib/job-enum"
import { serviceCategoryValues, serviceStatusValues } from "@workspace/ui/lib/service-enum"
import { taskCategoryValues, taskStatusValues } from "@workspace/ui/lib/task-enum"
import { roleValues } from "@workspace/ui/lib/role-enum";
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
    companyImage: z.string().url("Invalid URL").optional(),
    description: z.string().min(1, "Required").trim(),

    category: z.enum(jobCategoryValues, { required_error: "Required" }),
    locationRequirement: z.enum(locationRequirementValues, { required_error: "Required" }),
    experienceLevel: z.enum(experienceLevelValues, { required_error: "Required" }),
    type: z.enum(jobListingTypeValues, { required_error: "Required" }),

    // Skill/stack tags used for auto-apply and filtering
    tags: z.array(z.string()).default([]).optional(),

    // Wage: accept number OR numeric string; allow empty -> null
    wage: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return null
      if (typeof val === "string" && val.trim() !== "") return Number(val)
      return val
    }, z.number().int().positive().min(1).nullable().optional()),

    // Optional location bits (US-style state code if you use it)
    countryIso2: z
      .preprocess((val) => {
        if (typeof val === "string") {
          const v = val.trim();
          return v === "" ? undefined : v.toUpperCase();
        }
        return val;
      }, z.string().length(2, "Use 2-letter country code").optional())
      .optional(),
    stateAbbreviation: z
      .union([z.string().length(3, "Use 3-letter code"), emptyToUndefined])
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
  countryIso2: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const v = val.trim();
        return v === "" ? undefined : v.toUpperCase();
      }
      return val;
    }, z.string().length(2))
    .optional(),
})
export type JobListQueryValues = z.infer<typeof jobListQuerySchema>

// Auto-apply job list/query schema (pagination + prefs overrides)
export const autoApplyJobListQuerySchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(10),
  enabled: z.boolean().default(true),
  category: z.enum(jobCategoryValues).nullable().optional(),
  keywords: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
})
export type AutoApplyJobListQueryValues = z.infer<typeof autoApplyJobListQuerySchema>

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
  cv: fileSchema.optional(),
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
  resumeUrl: z.string().url().optional(),
})
export type JobApplicationCreateValues = z.infer<typeof jobApplicationCreateSchema>

// Apply for auto-apply job schema (server-side, no CV upload – uses logged-in user)
export const jobApplyForAutoJobSchema = z.object({
  jobId: z.string().uuid(),
})
export type JobApplyForAutoJobValues = z.infer<typeof jobApplyForAutoJobSchema>

// Service schemas
export const serviceListingFormSchema = z
  .object({
    title: z.string().min(1, "Required").trim(),
    description: z.string().min(1, "Required").trim(),
    serviceCategory: z.enum(serviceCategoryValues, { required_error: "Required" }),
    type: z.string().min(1, "Required").trim(), // subtype like "Dentist", "Plumber"
    // Accept number OR numeric string; allow ""/null -> error by schema
    price: z.preprocess((val) => {
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed === "") return undefined;
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? val : parsed;
      }
      return val;
    }, z.number().int().positive().min(1, "Price must be at least 1")),

     // Display information
     displayName: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
     // Primary image optional
     displayImage: z.union([z.string().url("Invalid URL"), emptyToUndefined]).optional(),
     // Require at least one image; allow temporary placeholders pre-upload
     images: z.array(z.string().min(1)).min(1, "At least one image is required"),

    
    // Location
    stateAbbreviation: z
      .union([z.string().length(3, "Use 3-letter code"), emptyToUndefined])
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
  // priceType removed
})
export type ServiceListQueryValues = z.infer<typeof serviceListQuerySchema>

// Get service by id validation schema
export const serviceGetByIdSchema = z.object({ id: z.string().uuid() })
export type ServiceGetByIdValues = z.infer<typeof serviceGetByIdSchema>



// Task schemas
export const taskListingFormSchema = z
  .object({
    title: z.string().optional().nullable(),
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
      .union([z.string().length(3, "Use 3-letter code"), emptyToUndefined])
      .optional(),
    city: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
    address: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),

    // Contact information
    phoneNumber: phoneSchema,
    email: z.string().email().optional().nullable(),

    // Display information
    displayName: z.union([z.string().min(1).trim(), emptyToUndefined]).optional(),
    displayImage: z.union([z.string().url("Invalid URL"), emptyToUndefined]).optional(),

    // Background style
    bgStyle: z.union([z.string().min(1), emptyToUndefined]).optional(),

    
    // Deadline
    deadline: z.string().optional(), // ISO date string

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

// Favorite schemas
export const addFavoriteSchema = z.object({
  jobId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
}).refine(
  (data) => [data.jobId, data.serviceId, data.taskId].filter(Boolean).length === 1,
  { message: "Exactly one of jobId, serviceId, or taskId must be provided" }
);
export type AddFavoriteValues = z.infer<typeof addFavoriteSchema>

export const removeFavoriteSchema = z.object({
  id: z.string().uuid(),
});
export type RemoveFavoriteValues = z.infer<typeof removeFavoriteSchema>

export const getFavoritesSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(10),
  type: z.enum(["job", "service", "task"]).optional(),
});
export type GetFavoritesValues = z.infer<typeof getFavoritesSchema>

// Moderation schemas

export const moderateApproveSchema = z.object({ id: z.string().uuid() })
export type ModerateApproveValues = z.infer<typeof moderateApproveSchema>

export const moderateRejectSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Reason is required"),
})
export type ModerateRejectValues = z.infer<typeof moderateRejectSchema>

// Update user role schema


export const updateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(roleValues),
});
export type UpdateUserRoleValues = z.infer<typeof updateUserRoleSchema>;

//Resume Update Schema
export const resumeUpdateSchema = z.object({
  resumeUrl: z.string().url(),
});
export type ResumeUpdateValues = z.infer<typeof resumeUpdateSchema>;

// Resume embedding update schema (extracted text from uploaded PDF)
export const resumeEmbeddingUpdateSchema = z.object({
  resumeText: z.string().min(20, "Resume text too short to embed"),
});
export type ResumeEmbeddingUpdateValues = z.infer<typeof resumeEmbeddingUpdateSchema>;


//Job bulk Import Schema
export const jobImportRowSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1),
  companyImage: z.preprocess((val) => {
    if (val === undefined || val === null) return null;
    if (typeof val !== "string") return null;
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }, z.union([z.string().url(), z.null()]).optional()),
  description: z.string().min(1),
  // Skill tags (CSV cell can be: "React, Next.js, Docker" or '["React","Docker"]')
  tags: z
    .preprocess((val) => {
      if (val === undefined || val === null) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed) return [];
        // JSON array support
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
          } catch {}
          try {
            const parsedSingleQuoted = JSON.parse(trimmed.replace(/'/g, '"'));
            if (Array.isArray(parsedSingleQuoted)) return parsedSingleQuoted;
          } catch {}
        }
        // CSV / pipe / semicolon
        return trimmed
          .split(/[,\|;]+/g)
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      }
      return [];
    }, z.array(z.string()))
    .optional()
    .nullable(),
  category: z.preprocess((val) => {
    if (typeof val === "string") {
      const normalized = val.trim();
      const matched = jobCategoryValues.find((c) => c.toLowerCase() === normalized.toLowerCase());
      return matched ?? "Other";
    }
    return val;
  }, z.enum(jobCategoryValues)),
  type: z.enum(jobListingTypeValues),
  locationRequirement: z.enum(locationRequirementValues),
  experienceLevel: z.enum(experienceLevelValues),
  wage: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null
    if (typeof val === "string" && val.trim() !== "") return Number(val)
    return val
  }, z.number().int().positive().min(1).nullable().optional()),
  countryIso2: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const v = val.trim();
        return v === "" ? undefined : v.toUpperCase();
      }
      return val;
    }, z.string().length(2))
    .optional()
    .nullable(),
  stateAbbreviation: z.preprocess((val) => {
    if (typeof val === "string") {
      const v = val.trim().toUpperCase();
      if (v === "") return undefined;
      return v;
    }
    return val;
  }, z.union([z.string().length(2), z.string().length(3)]).optional().nullable()),
  city: z.string().optional().nullable(),
  applicationEmail: z.union([z.string().email(), emptyToUndefined]).optional().nullable(),
  applicationUrl: z.union([z.string().url(), emptyToUndefined]).optional().nullable(),
});

export const jobImportSchema = z.object({
  rows: z.array(jobImportRowSchema).min(1),
});

export const serviceImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  serviceCategory: z.enum(serviceCategoryValues),
  type: z.string().min(1),
  price: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null
    if (typeof val === "string" && val.trim() !== "") return Number(val)
    return val
  }, z.number().int().positive().min(1).nullable().optional()),
  stateAbbreviation: z.preprocess((val) => {
    if (typeof val === "string") return val.trim().toUpperCase();
    return val;
  }, z.union([z.string().length(2), z.string().length(3)]).optional().nullable()),
  averageRating: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return 0;
    const num = Number(val);
    return Number.isNaN(num) ? 0 : num;
  }, z.number().min(0).max(5).nullable().optional()),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  displayName: z.string().optional().nullable(),
  displayImage: z.string().url().optional().nullable(),
  images: z.preprocess((val) => {
    if (val === undefined || val === null) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed === "") return [];
      // Case 1: Bracketed list → try JSON (supports single-quoted by replacement)
      if ((trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        try {
          const parsedSingleQuoted = JSON.parse(trimmed.replace(/'/g, '"'));
          if (Array.isArray(parsedSingleQuoted)) return parsedSingleQuoted;
        } catch {}
        // Fallback: manual split removing quotes
        const inner = trimmed.slice(1, -1);
        return inner
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      }
      // Case 2: CSV string → split and strip quotes
      if (trimmed.includes(",")) {
        return trimmed
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      }
      // Case 3: Single URL string → strip surrounding quotes if any
      return [trimmed.replace(/^['"]|['"]$/g, "")];
    }
    return [];
  }, z.array(z.string().url())).optional().nullable(),
  status: z.enum(serviceStatusValues).optional().nullable(),
});
export const serviceImportSchema = z.object({ rows: z.array(serviceImportRowSchema).min(1) });

export const taskImportRowSchema = z.object({
  title: z.string().optional().nullable(),
  description: z.string().min(1),
  category: z.enum(taskCategoryValues),
  budget: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null
    if (typeof val === "string" && val.trim() !== "") return Number(val)
    return val
    }, z.number().int().positive().min(1).nullable().optional()),
  stateAbbreviation: z.string().length(3).optional().nullable(),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  displayName: z.string().optional().nullable(),
  displayImage: z.string().url().optional().nullable(),
  bgStyle: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(), // ISO string
  status: z.enum(taskStatusValues).optional().nullable(),
});
export const taskImportSchema = z.object({ rows: z.array(taskImportRowSchema).min(1) });

//Auto Apply Schema
export const autoApplyPrefsSchema = z.object({
  enabled: z.boolean(),
  category: z.enum(jobCategoryValues).nullable(),
  keywords: z.array(z.string()).max(100),
  roles: z.array(z.string()).max(50).default([]),
});
export type AutoApplyPrefsValues = z.infer<typeof autoApplyPrefsSchema>;