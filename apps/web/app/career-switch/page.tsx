import Image from "next/image";
import { Sparkles } from "lucide-react";

import { CareerSwitchPlanner } from "@/components/ui/career-switch";
import { requireUser } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";

export default async function CareerSwitchPage() {
  await requireUser("/career-switch");
  const t = await getTranslations("CareerSwitchPage");

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-4 -mb-20 flex min-h-screen w-screen max-w-none flex-col overflow-hidden md:-mt-10 md:-mb-4">
      <section className="flex isolate overflow-hidden relative flex-1 justify-center items-center">
        <Image
          src="/images/career-switch.jpg"
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
          <p className="text-base font-bold leading-relaxed text-gray-500 md:text-lg md:leading-relaxed lg:max-w-3xl">
            {t("subtitle")}
          </p>
          <button className="flex gap-2 items-center px-8 py-4 mt-4 text-base font-semibold text-white bg-gradient-to-r from-orange-400 to-pink-400 rounded-full shadow-lg transition-all duration-300 hover:from-pink-600 hover:via-orange-600 hover:to-red-600 hover:shadow-xl">
            <Sparkles className="w-5 h-5" />
            {t("start")}
          </button>
        </div>
      </section>

      {/*<div className="px-6 py-14 mx-auto w-full max-w-6xl md:py-16 lg:py-20">
        <CareerSwitchPlanner />
      </div>*/}
    </div>
  );
}
