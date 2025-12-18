import Image from "next/image";

import { CareerSwitchPlanner } from "@/components/ui/career-switch";
import { requireUser } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";

export default async function CareerSwitchPage() {
  await requireUser("/career-switch");
  const t = await getTranslations("CareerSwitchPage");

  return (
    <div className="flex flex-col min-h-screen">
      <section className="flex isolate overflow-hidden relative flex-1 justify-center items-center text-white bg-slate-950">
        <Image
          src="/images/career-switch.png"
          alt={t("title")}
          fill
          priority
          className="object-cover absolute inset-0 w-full h-full"
          sizes="100vw"
        />

        <div className="flex relative flex-col gap-6 items-center px-6 py-24 mx-auto max-w-5xl text-center md:gap-7 md:py-28 lg:py-32">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl md:leading-tight lg:text-6xl">
            {t("title")}
          </h1>
          <p className="text-base leading-relaxed text-slate-100/90 md:text-lg md:leading-relaxed lg:max-w-3xl">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/*<div className="px-6 py-14 mx-auto w-full max-w-6xl md:py-16 lg:py-20">
        <CareerSwitchPlanner />
      </div>*/}
    </div>
  );
}
