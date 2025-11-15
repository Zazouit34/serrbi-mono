import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { SerrbiMark } from "@/components/SerrbiMark";

const posts = [
  {
    id: "afdal-mawaqi3-al-amel-maroc-2025",
    date: "Nov 14, 2025",
    title: "أفضل المواقع للبحث عن عمل في المغرب (دليل عملي لعام 2025)",
    subtitle:
      "تعرف على أهم المواقع المغربية والدولية للبحث عن عمل في المغرب وكيف تستفيد منها خطوة بخطوة.",
    author: { name: "Serrbi Editorial", role: "Rédaction", avatarUrl: "" },
    href: "/blog/afdal-mawaqi3-al-amel-maroc-2025",
  },
  {
    id: "meilleurs-sites-emploi-maroc-2025",
    date: "Nov 14, 2025",
    title: "Meilleurs sites pour trouver un emploi au Maroc (Guide pratique 2025)",
    subtitle:
      "Découvrez les principaux sites marocains et internationaux pour trouver un emploi au Maroc et comment en tirer parti étape par étape.",
    author: { name: "Serrbi Editorial", role: "Rédaction", avatarUrl: "" },
    href: "/blog/meilleurs-sites-emploi-maroc-2025",
  },
  {
    id: "amal-belgika-lilmaghariba-2025",
    date: "Nov 15, 2025",
    title: "عمل بلجيكا للمغاربة في 2025: دليلك السريع من العقد إلى الفيزا",
    subtitle:
      "القطاعات المطلوبة والرواتب، طريقة إيجاد عقد قانوني عبر EURES، والوثائق الأساسية لفيزا العمل، وكيف تطوّر سيرتك عبر Serrbi.",
    author: { name: "Serrbi Editorial", role: "Rédaction", avatarUrl: "" },
    href: "/blog/amal-belgika-lilmaghariba-2025",
  },
  {
    id: "travail-belgique-marocains-2025",
    date: "Nov 15, 2025",
    title: "Travail en Belgique pour les Marocains en 2025 : guide rapide du contrat au visa",
    subtitle:
      "Secteurs en demande et salaires, EURES, documents du visa, et optimisation du CV avec Serrbi.",
    author: { name: "Serrbi Editorial", role: "Rédaction", avatarUrl: "" },
    href: "/blog/travail-belgique-marocains-2025",
  },
];

export default async function BlogPage() {
  const t = await getTranslations("Blog");
  const locale = await getLocale();
  const isRtl = locale === "ar";
  return (
    <div className="py-10 mx-auto w-full max-w-2xl">
      <h1 className="mb-6 text-3xl font-semibold text-center">{t("title")}</h1>
      <div className="space-y-10">
        {posts.map((post) => (
          <article key={post.id} className="space-y-3">
            <div className="text-xs text-muted-foreground">{post.date}</div>
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <p className="text-sm text-muted-foreground">{post.subtitle}</p>
            <div className="flex gap-3 items-center mt-3">
              <Avatar>
                <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                <AvatarFallback className="flex justify-center items-center">
                  <SerrbiMark width={20} height={20} />
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">{post.author.name}</div>
                <div className="text-muted-foreground">{post.author.role}</div>
              </div>
            </div>
            <div className="mt-2">
              <Link href={post.href} className="text-primary">
                {t("continue")} {isRtl ? "←" : "→"}
              </Link>
            </div>
            <hr className="mt-4 border-muted" />
          </article>
        ))}
      </div>
    </div>
  );
}


