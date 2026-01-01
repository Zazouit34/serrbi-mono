import ResumeInsight from "@/components/ui/resume-insight";
import { requireUser } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";

export default async function ResumeAnalyzerPage() {
  await requireUser("/resume-analyzer");
  

  return <ResumeInsight requireLogin callbackUrl="/resume-analyzer" />;
}
