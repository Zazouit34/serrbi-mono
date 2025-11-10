import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@workspace/ui/components/button";
import { SerrbiMark } from "@/components/SerrbiMark";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <SerrbiMark className="mb-6 w-12 h-12" />
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-6">
        <Link href="/">
          <Button className="rounded-full">{t("cta")}</Button>
        </Link>
      </div>
    </div>
  );
}


