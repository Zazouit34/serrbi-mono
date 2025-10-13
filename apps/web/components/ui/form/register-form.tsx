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
import { Input } from '@workspace/ui/components/input'
import { PasswordInput } from './password-input'
import { PhoneInput } from './phone-input'
import { trpc } from '@/app/_trpc/client'
import { loginCredentials } from '@/lib/actions/auth'

import { registerFormSchema, type RegisterFormValues } from '@workspace/ui/lib/validation-schemas'
import { useTranslations } from 'next-intl'


export default function RegisterForm() {
  const t = useTranslations('Auth.Register')
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
    <div className="flex flex-col justify-center items-center px-4 py-8">
      <div className="space-y-6 w-full max-w-md">
        {/* Header */}
        <div className='flex flex-col gap-4 justify-center items-center text-center'>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className='text-sm text-center text-muted-foreground'>
            {t('subtitle')}
          </p>
        </div>

        {/* Form */}
        <Form {...form as any}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Name Field */}
              <FormField
                control={form.control as any}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name">{t('name')}</FormLabel>
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
                  <FormItem>
                    <FormLabel htmlFor="email">{t('email')}</FormLabel>
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
                  <FormItem>
                    <FormLabel htmlFor="phone">{t('phone')}</FormLabel>
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
                  <FormItem>
                    <FormLabel htmlFor="password">{t('password')}</FormLabel>
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
                  <FormItem>
                    <FormLabel htmlFor="confirmPassword">
                      {t('confirmPassword')}
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
                {t('submit')}
              </Button>
            </div>
          </form>
        </Form>
        
        {/* Footer */}
        <div className="text-sm text-center text-muted-foreground">
          {t('loginCta')}{' '}
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline hover:text-primary">
            {t('loginLink')}
          </Link>
        </div>
      </div>
    </div>
  )
}