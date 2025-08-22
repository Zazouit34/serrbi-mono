import { z } from 'zod'
import { isValidPhoneNumber } from "libphonenumber-js";

export const emailSchema = z.string().email({ message: 'Invalid email address' })

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
