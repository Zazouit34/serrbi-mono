"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";

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
import { useTranslations } from "next-intl";

import {
  loginFormSchema,
  type LoginFormValues,
} from "@workspace/ui/lib/validation-schemas";
import { loginCredentials, loginGoogle } from "@/lib/actions/auth";

export default function LoginForm() {
  const t = useTranslations("Auth.Login");
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
    onSuccess: (data) => {
      setSuccess(data.message);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setError("");
    setSuccess("");
    
    // First do tRPC validation/user creation
    loginMutation.mutate(values);
    
    // Then use NextAuth's client-side signIn for session management
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
      } else if (result?.ok) {
        // Success - redirect to update session
        window.location.href = callbackUrl;
      }
    });
  }

  // Update Google login to use client-side signIn
  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div className="flex flex-col justify-center items-center px-4 py-8">
      <div className="space-y-6 w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col gap-4 justify-center items-center text-center">
          <div className="flex flex-col gap-2 items-center">
            <SerrbiMark className="w-10 h-10" />
            <h1 className="text-2xl font-bold">{t("title")}</h1>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            {t("subtitle")} {" "}
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="underline hover:text-primary"
            >
              {t("signUpCta")}
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
                    <FormLabel htmlFor="email">{t("email")}</FormLabel>
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
                      <FormLabel htmlFor="password">{t("password")}</FormLabel>
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
                      {t("forgot")}
                    </Link>
                  </FormItem>
                )}
              />

              <FormError message={error} />
              <FormSuccess message={success} />

              <div className="space-y-3">
                <Button type="submit" className="w-full" disabled={isPending}>
                  {t("submit")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  type="button"
                >
                  <FcGoogle className="mr-2 size-4" />
                  {t("google")}
                </Button>
              </div>
            </div>
          </form>
        </Form>

        {/* Footer */}
        <div className="text-xs text-center text-muted-foreground text-balance">
          {t("terms")} {" "}
          <Link
            href="#"
            className="underline underline-offset-4 hover:text-primary"
          >
            {t("termsLink")}
          </Link>{" "}
          {t("and")} {" "}
          <Link
            href="#"
            className="underline underline-offset-4 hover:text-primary"
          >
            {t("privacy")}
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
