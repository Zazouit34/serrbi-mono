import ResumeInsight from "@/components/ui/resume-insight";
import { requireUser } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";

export default async function ResumeAnalyzerPage() {
  await requireUser("/resume-analyzer");
  const t = await getTranslations("ResumeAnalyzerPage");

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
      <ResumeInsight requireLogin callbackUrl="/resume-analyzer" />
    </div>
  );
}

