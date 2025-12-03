"use client";

import { Button } from "@workspace/ui/components/button";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";

const steps = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1584907797015-7554cd315667?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
    key: "1",
    href: "/resume-analyzer",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1758874384554-a00d65bca8aa?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
    key: "2",
    href: "/career-switch",
  },
  {
    id: 3,
    image:
      "https://plus.unsplash.com/premium_photo-1682309526815-efe5d6225117?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
    key: "3",
    href: "/account/auto-apply",
  },
];

export function HowItWorks() {
  const t = useTranslations("HowItWorks");
  return (
    <section className="flex flex-col gap-12 py-18">
      {/* Section header */}
      <div className="flex flex-col gap-4 items-center text-center">
        <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Cards container */}
      <div
        className="flex overflow-x-auto gap-6 px-6 pb-4 -mx-6 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible snap-x snap-mandatory md:snap-none md:pb-0 md:mx-0 md:px-0"
      >
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2, duration: 0.5 }}
            viewport={{ once: true }}
            className="min-w-[85%] sm:min-w-[70%] md:min-w-0 snap-center flex flex-col overflow-hidden bg-white"
          >
            <div className="overflow-hidden relative w-full h-52 rounded-xl md:h-60">
              <Image
                src={step.image}
                alt={t(`steps.${step.key}.title`)}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>

            <div className="flex flex-col items-start mt-5 text-left">
              <h3 className="text-xl font-semibold">{t(`steps.${step.key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`steps.${step.key}.description`)}
              </p>
              <div>
                <Button asChild className="mt-4 text-white bg-black hover:bg-black/80"><a href={step.href}>{t(`steps.${step.key}.action`)}</a></Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
