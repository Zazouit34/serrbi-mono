import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";

type Post = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  author: { name: string; role: string; avatarUrl?: string };
  href: string;
};

const posts: Post[] = [
  {
    id: "1",
    date: "Nov 10, 2025",
    title: "Launching Serrbi Jobs: Smarter Discovery",
    subtitle: "How we’re improving job discovery and applications with AI workflows.",
    author: { name: "Serrbi Team", role: "Product", avatarUrl: "" },
    href: "/blog/launch-serrbi-jobs",
  },
  {
    id: "2",
    date: "Oct 28, 2025",
    title: "Behind the Resume Analyzer",
    subtitle: "A look at our ATS heuristics and what ‘good’ looks like in 2025.",
    author: { name: "Serrbi Team", role: "Engineering", avatarUrl: "" },
    href: "/blog/resume-analyzer",
  },
];

export default async function BlogPage() {
  const t = await getTranslations("Blog");
  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <h1 className="mb-6 text-center text-3xl font-semibold">{t("title")}</h1>
      <div className="space-y-10">
        {posts.map((post) => (
          <article key={post.id} className="space-y-3">
            <div className="text-xs text-muted-foreground">{post.date}</div>
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <p className="text-sm text-muted-foreground">{post.subtitle}</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar>
                <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                <AvatarFallback>
                  {post.author.name
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">{post.author.name}</div>
                <div className="text-muted-foreground">{post.author.role}</div>
              </div>
            </div>
            <div className="mt-2">
              <Link href={post.href} className="text-primary hover:underline">
                {t("continue")} →
              </Link>
            </div>
            <hr className="mt-4 border-muted" />
          </article>
        ))}
      </div>
    </div>
  );
}


