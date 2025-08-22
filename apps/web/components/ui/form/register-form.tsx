'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useSearchParams } from "next/navigation";
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormError } from './form-error'
import { FormSuccess } from './form-success'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { PasswordInput } from './password-input'
import { PhoneInput } from './phone-input'
import { trpc } from '@/app/_trpc/client'
import { loginCredentials } from '@/lib/actions/auth'

import { registerFormSchema, type RegisterFormValues } from '@workspace/ui/lib/validation-schemas'


export default function RegisterForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")
  const [isPending, startTransition] = useTransition()

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
        setSuccess(data.message)
    },
    onError: (error) => {
        setError(error.message)
    },
})

async function onSubmit(values: RegisterFormValues) {
  setError('')
  setSuccess('')
  startTransition(async () => {
    try {
      // Create the user first before login
      await registerMutation.mutateAsync(values)
    
      await loginCredentials(values.email, values.password, callbackUrl)
    } catch {
      
    }
  })
}

  return (
    <div className="flex justify-center items-center px-4 w-full h-full min-h-[90vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
          <CardDescription>
            Create a new account by filling out the form below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form as any}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-4">
                {/* Name Field */}
                <FormField
                  control={form.control as any}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="name">Name</FormLabel>
                      <FormControl>
                        <Input id="name" placeholder="John Doe" {...field} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email Field */}
                <FormField
                  control={form.control as any}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="email">Email</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          placeholder="johndoe@mail.com"
                          disabled={isPending}
                          type="email"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Field */}
                <FormField
                  control={form.control as any}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="phone">Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput {...field} defaultCountry="MA" international disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Field */}
                <FormField
                  control={form.control as any}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="password">Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          id="password"
                          placeholder="******"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password Field */}
                <FormField
                  control={form.control as any}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="confirmPassword">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          id="confirmPassword"
                          placeholder="******"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormError message={error} />
                <FormSuccess message={success} />

                <Button type="submit" className="w-full" disabled={isPending}>
                  Register
                </Button>
              </div>
            </form>
          </Form>
          <div className="mt-4 text-sm text-center">
            Already have an account?{' '}
            <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
