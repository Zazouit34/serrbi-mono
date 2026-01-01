import ResumeInsight from "@/components/ui/resume-insight";
import { requireUser } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";

export default async function ResumeAnalyzerPage() {
  await requireUser("/resume-analyzer");
  const t = await getTranslations("ResumeAnalyzerPage");

  return (
    <div className="flex flex-col gap-10 py-16 mx-auto">
      <ResumeInsight requireLogin callbackUrl="/resume-analyzer" />
    </div>
  );
}

