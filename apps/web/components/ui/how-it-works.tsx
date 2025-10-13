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
    href: "/jobs/resume-listing/new",
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1758874384554-a00d65bca8aa?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?q=80&w=1200&auto=format&fit=crop",
    key: "2",
    href: "/jobs",
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
    <section className="py-18 flex flex-col gap-12">
      {/* Section header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
          {t("title")}
        </h2>
        <p className="text-muted-foreground max-w-2xl">
          {t("subtitle")}
        </p>
      </div>

      {/* Cards container */}
      <div
        className="
          flex md:grid md:grid-cols-3 gap-6 md:gap-8
          overflow-x-auto md:overflow-visible
          snap-x snap-mandatory md:snap-none
          pb-4 md:pb-0
          -mx-6 px-6 md:mx-0 md:px-0
        "
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
            <div className="relative w-full h-52 md:h-60 overflow-hidden rounded-xl">
              <Image
                src={step.image}
                alt={t(`steps.${step.key}.title`)}
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>

            <div className="flex flex-col items-start text-left mt-5">
              <h3 className="text-xl font-semibold">{t(`steps.${step.key}.title`)}</h3>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                {t(`steps.${step.key}.description`)}
              </p>
              <div>
                <Button asChild className="mt-4 bg-black text-white hover:bg-black/80"><a href={step.href}>{t(`steps.${step.key}.action`)}</a></Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
