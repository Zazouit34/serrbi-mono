'use client'

import { useEffect , useMemo , useState , useTransition} from 'react'
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

import { PasswordInput } from './password-input'
import { trpc } from '@/app/_trpc/client'

import { resetPasswordFormSchema , type ressetPasswordFormValues} from '@workspace/ui/lib/validation-schemas'
import { useSearchParams } from 'next/navigation'


const formSchema = resetPasswordFormSchema

export default function ResetPasswordPreview() {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
 
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token'), [searchParams])


  
  const verifyResetToken = trpc.auth.verifyResetToken.useQuery({ token: token || '' }, { enabled: Boolean(token) })

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message)
  },
  onError: (error) => {
      setError(error.message)
  },
  })

  const form = useForm<ressetPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: token || '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    // ensure token in form state updates when URL token becomes available/changes
    form.setValue('token', token || '')
  }, [token])

  async function onSubmit(values: ressetPasswordFormValues) {
    setError('')
    setSuccess('')
    startTransition(async () => {
      try {
        // Assuming an async reset password function
        resetPassword.mutate({
        token: token || '',
        password: values.password,
        confirmPassword: values.confirmPassword,
      })
    } catch {

      }
    })
  }

  return (
    <div className="flex min-h-[80vh] h-full w-full items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form as any}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* hidden token field to satisfy schema validation */}
              <input type="hidden" {...form.register('token')} value={token || ''} />
              <div className="grid gap-4">
                {/* New Password Field */}
                <FormField
                  control={form.control as any}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="password">New Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          id="password"
                          placeholder="******"
                          autoComplete="new-password"
                          {...field}
                          disabled={isPending}
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
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormError message={error} />
                <FormSuccess message={success} />

                <Button type="submit" className="w-full" disabled={isPending}>
                  Reset Password
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
