import { getTranslations } from "next-intl/server";
import { Container } from "@workspace/ui/components/container";
import { MarkdownRenderer } from "@/components/ui/markdown/markdown-renderer";

export default async function PrivacyPage() {
  const t = await getTranslations();
  return (
    <Container className="py-10">
      <h1 className="mb-6 text-2xl font-semibold md:text-3xl">{t("Privacy.title")}</h1>
      <MarkdownRenderer source={t("Privacy.content")} />
    </Container>
  );
}


