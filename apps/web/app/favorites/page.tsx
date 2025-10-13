import { FavoriteListing } from "./favorite-listing/favorite-listing";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const t = await getTranslations("FavoritesPage");
  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col items-center py-0 space-y-4 md:py-16 md:space-y-10">
        <h1 className="pt-4 text-2xl md:text-5xl text-foreground font-outfit">
          {t("title")}
        </h1>
        <p className="text-lg text-gray-500 md:text-xl font-outfit">
          {t("subtitle")}
        </p>
      </div>
      <div className="grid gap-6">
        <FavoriteListing />
      </div>
    </div>
  );
}
