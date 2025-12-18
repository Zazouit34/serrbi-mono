import { requireUser } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";
import { CareerSwitchExperience } from "./experience-shell";

export default async function CareerSwitchPage() {
  await requireUser("/career-switch");
  const t = await getTranslations("CareerSwitchPage");

  return (
    <CareerSwitchExperience title={t("title")} subtitle={t("subtitle")} startLabel={t("start")} />
  );
}
