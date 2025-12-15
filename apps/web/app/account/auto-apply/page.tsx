import AutoApplySettingsPage from "@/components/ui/subscription/auto-apply-client";
import { getTranslations } from "next-intl/server";

export default async function AutoApplyPageClient() {
  const t = await getTranslations("AutoApply");
  return (
    <div className="flex flex-col items-center space-y-8">
      {/*<div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold font-outfit">{t("page.title")}</h1>
        <p className="text-center text-muted-foreground font-outfit">
          {t("page.subtitle")}
        </p>
      </div>*/}
      <AutoApplySettingsPage />
    </div>
  );
}