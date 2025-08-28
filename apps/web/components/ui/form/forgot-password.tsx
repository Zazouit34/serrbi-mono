'use client'

import { useState, useTransition } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { trpc } from '@/app/_trpc/client'

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
import { FormError } from './form-error'
import { FormSuccess } from './form-success'

import {  emailFormSchema, type emailFormValues } from '@workspace/ui/lib/validation-schemas'

// Schema for email validation
const formSchema = emailFormSchema

export default function ForgetPasswordPreview() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")
  const form = useForm<emailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  })


  const forgotPassword = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message)
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  async function onSubmit(values: emailFormValues) {
    setSuccess('')
    setError('')
    startTransition(async () => {
        try {
          // Create the user first before login
          await forgotPassword.mutateAsync(values)
    
        } catch {
          
        }
      })

  }

  return (
    <div className="flex min-h-[60vh] h-full w-full items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address to receive a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-4">
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
                          type="email"
                          disabled={isPending}
                          autoComplete="email"
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
                  Send Reset Link
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
