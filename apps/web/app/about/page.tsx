import { getTranslations } from "next-intl/server";

export default async function AboutPage() {
  const t = await getTranslations("About");
  const sections = [
    { title: t("sections.mission.title"), text: t("sections.mission.text") },
    { title: t("sections.offer.title"), text: t("sections.offer.text") },
    { title: t("sections.how.title"), text: t("sections.how.text") },
    { title: t("sections.audience.title"), text: t("sections.audience.text") },
  ];

  return (
    <div className="py-10 mx-auto w-full max-w-2xl">
      <h1 className="mb-6 text-3xl font-semibold text-center">{t("title")}</h1>
      <div className="space-y-8">
        {sections.map((s, idx) => (
          <section key={idx} className="space-y-2">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="text-sm text-muted-foreground">{s.text}</p>
            {idx < sections.length - 1 && <hr className="mt-4 border-muted" />}
          </section>
        ))}
      </div>
    </div>
  );
}


