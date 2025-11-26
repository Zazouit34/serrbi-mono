import { CareerSwitchPlanner } from "@/components/ui/career-switch";
import { requireUser } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";

export default async function CareerSwitchPage() {
  await requireUser("/career-switch");
  const t = await getTranslations("CareerSwitchPage");

  return (
    <div className="container mx-auto flex flex-col gap-10 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-violet-500">
          {t("badge")}
        </span>
        <h1 className="text-4xl font-bold md:text-5xl">{t("title")}</h1>
        <p className="text-muted-foreground text-base md:text-lg">
          {t("subtitle")}
        </p>
      </div>
      <CareerSwitchPlanner />
    </div>
  );
}

