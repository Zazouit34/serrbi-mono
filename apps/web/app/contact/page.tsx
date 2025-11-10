"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useTranslations } from "next-intl";

const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(4, "Subject is too short"),
  message: z.string().min(10, "Message is too short"),
});

type ContactValues = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const t = useTranslations("Contact");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });
  const [charCount, setCharCount] = useState(0);

  const onSubmit = async (values: ContactValues) => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to send message");
      }
      toast.success(t("toasts.success"));
      reset();
      setCharCount(0);
    } catch (err: any) {
      toast.error(err?.message || t("toasts.error"));
    }
  };

  return (
    <div className="py-10 mx-auto w-full max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold md:text-3xl">{t("title")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t("subtitle")}
      </p>
      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block mb-1 text-sm font-medium">
                {t("fields.name")}
              </label>
              <Input id="name" placeholder={t("placeholders.name")} {...register("name")} />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block mb-1 text-sm font-medium">
                {t("fields.email")}
              </label>
              <Input
                id="email"
                placeholder={t("placeholders.email")}
                type="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block mb-1 text-sm font-medium">
              {t("fields.subject")}
            </label>
            <Input id="subject" placeholder={t("placeholders.subject")} {...register("subject")} />
            {errors.subject && (
              <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="message" className="block mb-1 text-sm font-medium">
              {t("fields.message")}
            </label>
            <div className="relative">
              <textarea
                id="message"
                rows={6}
                className="block px-3 py-2 w-full text-sm rounded-md border shadow-sm outline-none border-input bg-background focus-visible:ring-1 focus-visible:ring-black"
                placeholder={t("placeholders.message")}
                {...register("message")}
                onChange={(e) => setCharCount(e.target.value.length)}
              />
              <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {charCount} chars
              </span>
            </div>
            {errors.message && (
              <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => reset()} disabled={isSubmitting}>
              {t("buttons.reset")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("buttons.sending") : t("buttons.send")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


