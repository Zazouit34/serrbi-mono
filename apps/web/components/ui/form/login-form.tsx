"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import { useSession } from "next-auth/react";

import { SerrbiMark } from "../../SerrbiMark";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Button } from "@workspace/ui/components/button";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@workspace/ui/components/input";
import { PasswordInput } from "./password-input";
import { FormError } from "./form-error";
import { FormSuccess } from "./form-success";

import {
  loginFormSchema,
  type LoginFormValues,
} from "@workspace/ui/lib/validation-schemas";
import { loginCredentials, loginGoogle } from "@/lib/actions/auth";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [isPending, startTransition] = useTransition();
  
  const { update } = useSession();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      setSuccess(data.message);
      // Update session after successful tRPC validation
      await update();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setError("");
    setSuccess("");
    
    try {
      // First validate with tRPC
      await loginMutation.mutateAsync(values);
      
      // Then do the actual login with server action
      startTransition(async () => {
        await loginCredentials(values.email, values.password, callbackUrl);
        // Session will be updated by the redirect
      });
    } catch (error) {
      // Error handling is already done in mutation callbacks
    }
  }
  return (
    <div className="flex flex-col justify-center items-center px-4 py-8">
      <div className="space-y-6 w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col gap-4 justify-center items-center text-center">
          <div className="flex flex-col gap-2 items-center">
            <SerrbiMark className="w-10 h-10" />
            <h1 className="text-2xl font-bold">Login</h1>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="underline hover:text-primary"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Form */}
        <Form {...(form as any)}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control as any}
                name="email"
                render={({ field }) => (
                  <FormItem>
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
                  <FormItem>
                      <FormLabel htmlFor="password">Password</FormLabel>
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
                    <Link
                      href="/forgot"
                      className="text-sm underline hover:text-primary"
                    >
                      Forgot your password?
                    </Link>
                  </FormItem>
                )}
              />

              <FormError message={error} />
              <FormSuccess message={success} />

              <div className="space-y-3">
                <Button type="submit" className="w-full" disabled={isPending}>
                  Login
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => loginGoogle(callbackUrl)}
                  type="button"
                >
                  <FcGoogle className="mr-2 size-4" />
                  Login with Google
                </Button>
              </div>
            </div>
          </form>
        </Form>

        {/* Footer */}
        <div className="text-xs text-center text-muted-foreground text-balance">
          By clicking continue, you agree to our{" "}
          <Link
            href="#"
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="#"
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
