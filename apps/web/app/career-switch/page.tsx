import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { CareerSwitchPlanner } from "@/components/ui/career-switch";
import { requireUser } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";
import { Button } from "@workspace/ui/components/button";

export default async function CareerSwitchPage() {
  await requireUser("/career-switch");
  const t = await getTranslations("CareerSwitchPage");

  return (
    <div className="flex flex-col">
      <section className="isolate overflow-hidden relative">
        <Image
          src="/images/career-switch.png"
          alt={t("title")}
          fill
          priority
          className="object-contain absolute inset-0 w-[120%] h-[120%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          sizes="100vw"
        />

        <div className="flex relative flex-col gap-6 items-center px-6 py-24 mx-auto max-w-5xl text-center md:gap-7 md:py-28 lg:py-32">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl md:leading-tight lg:text-6xl">
            {t("title")}
          </h1>
          <p className="text-base leading-relaxed md:text-lg md:leading-relaxed lg:max-w-3xl">
            {t("subtitle")}
          </p>
          <Button
            asChild
            size="lg"
            className="font-semibold text-white bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500"
          >
            <Link href="#career-planner">
              <Sparkles className="mr-2 w-5 h-5" />
              {t("start")}
            </Link>
          </Button>
        </div>
      </section>

      {/*<div className="px-6 py-14 mx-auto w-full max-w-6xl md:py-16 lg:py-20">
        <CareerSwitchPlanner />
      </div>*/}
    </div>
  );
}
