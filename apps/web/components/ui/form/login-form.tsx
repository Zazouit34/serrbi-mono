'use client'

import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { useState, useTransition } from 'react'
import { useSearchParams } from "next/navigation";
import { trpc } from '@/app/_trpc/client'

import { SerrbiMark } from '../../SerrbiMark'
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
import { FcGoogle } from 'react-icons/fc'
import { Input } from '@workspace/ui/components/input'
import { PasswordInput } from './password-input'
import { FormError } from './form-error'
import { FormSuccess } from './form-success'

import { loginFormSchema, type LoginFormValues } from '@workspace/ui/lib/validation-schemas'
import { loginCredentials, loginGoogle } from '@/lib/actions/auth'


export default function LoginForm() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const [error, setError] = useState<string | undefined>("")
    const [success, setSuccess] = useState<string | undefined>("")
    const [isPending, startTransition] = useTransition()

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })
    const loginMutation = trpc.auth.login.useMutation({
        onSuccess: (data) => {
            setSuccess(data.message)
        },
        onError: (error) => {
            setError(error.message)
        },
    })

    async function onSubmit(values: LoginFormValues) {
        setError('')
        setSuccess('')
        startTransition(() => {
          loginCredentials(values.email, values.password, callbackUrl) // redirects to "/"
        })
        // keep tRPC validation for UI if you want:
        loginMutation.mutate(values)
      }
    return (
        <div className="flex flex-col min-h-[90vh] h-full w-full items-center justify-center px-4">
            <Card className="w-full max-w-md">
                <CardHeader className='flex flex-col gap-2 justify-center items-center text-center'>
                    <CardTitle className='flex flex-col gap-2 items-center' >
                        <SerrbiMark className="w-10 h-10" />
                        <span className="text-2xl">Login</span>
                    </CardTitle>
                    <CardDescription className='text-sm text-center text-black'>

                        Don&apos;t have an account?{' '}
                        <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline">
                            Sign up
                        </Link>
                    </CardDescription>
                </CardHeader>
                <CardContent>

                    <Form {...form as any}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="grid gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="grid gap-2">
                                            <FormLabel htmlFor="email">Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="email"
                                                    disabled={isPending}
                                                    placeholder="johndoe@mail.com"
                                                    type="email"
                                                    autoComplete="email"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control as any}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="grid gap-2">
                                            <div className="flex justify-between items-center">
                                                <FormLabel htmlFor="password">Password</FormLabel>
                                                <Link
                                                    href="#"
                                                    className="inline-block ml-auto text-sm underline"
                                                >
                                                    Forgot your password?
                                                </Link>
                                            </div>
                                            <FormControl>
                                                <PasswordInput
                                                    id="password"
                                                    disabled={isPending}
                                                    placeholder="******"
                                                    autoComplete="current-password"
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
                                    Login
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => loginGoogle(callbackUrl)} type='button'>
                                    <FcGoogle className="mr-2 size-4" />
                                    Login with Google
                                </Button>
                            </div>
                        </form>
                    </Form>
                    <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4 mt-4">
                        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
                        and <a href="#">Privacy Policy</a>.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
