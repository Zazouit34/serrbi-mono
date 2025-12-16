import ResumeInsight from "@/components/ui/resume-insight";
import { requireUser } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";

export default async function ResumeAnalyzerPage() {
  await requireUser("/resume-analyzer");
  const t = await getTranslations("ResumeAnalyzerPage");

  return (
    <div className="flex flex-col gap-10 py-16 mx-auto">
      <div className="flex flex-col gap-4 items-center mx-auto max-w-3xl text-center">
        <span className="text-xs font-semibold tracking-wide text-violet-500 uppercase">
          {t("badge")}
        </span>
        <h1 className="text-4xl font-bold md:text-5xl">{t("title")}</h1>
        <p className="text-base text-muted-foreground md:text-lg">
          {t("subtitle")}
        </p>
      </div>
      <ResumeInsight requireLogin callbackUrl="/resume-analyzer" />
    </div>
  );
}

