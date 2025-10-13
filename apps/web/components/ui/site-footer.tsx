"use client";

import Link from "next/link";
import { FaTwitter, FaGithub, FaDiscord } from "react-icons/fa";
import { useTranslations } from "next-intl";

const navigation = {
  main: [
    { key: "jobs", href: "/jobs" },
    { key: "services", href: "/services" },
    { key: "tasks", href: "/tasks" },
    { key: "pricing", href: "/subscription" },
  ],
  useCases: [
    { key: "findWork", href: "/jobs" },
    { key: "hireTalent", href: "/services" },
    { key: "getTasksDone", href: "/tasks" },
  ],
  compare: [
    { key: "vsFyxer", href: "/best-fyxer-alternative" },
    {
      key: "vsPerplexity",
      href: "/best-perplexity-email-assistant-alternative",
    },
  ],
  support: [
    { key: "contact", href: "/contact" },
    { key: "helpCenter", href: "/docs" },
    { key: "plans", href: "/subscription" },
  ],
  company: [
    { key: "about", href: "/about" },
    { key: "blog", href: "/blog" },
    { key: "careers", href: "/careers" },
  ],
  legal: [
    { key: "terms", href: "/terms" },
    { key: "privacy", href: "/privacy" },
    {
      key: "soc2",
      href: "https://security.getinboxzero.com",
      target: "_blank",
    },
    { key: "sitemap", href: "/sitemap.xml" },
  ],
};

export function SiteFooter() {
  const t = useTranslations("Footer");
  return (
    <footer className="relative">
      <div className="mx-auto w-full overflow-hidden rounded-2xl bg-[#0b0b0f] px-6 py-20 text-gray-300 sm:px-8 sm:py-24">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5 xl:col-span-2 xl:mt-0">
          <div>
            <FooterList title={t("headings.product")} items={navigation.main.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          </div>
          <div>
            <FooterList title={t("headings.useCases")} items={navigation.useCases.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
            <div className="mt-6">
              <FooterList title={t("headings.compare")} items={navigation.compare.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
            </div>
          </div>
          <div>
            <FooterList title={t("headings.support")} items={navigation.support.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          </div>
          <div>
            <FooterList title={t("headings.company")} items={navigation.company.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          </div>
          <div>
            <FooterList title={t("headings.legal")} items={navigation.legal.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          </div>
        </div>

        <div className="mt-16 flex justify-center gap-6">
          <Link aria-label="Twitter" href="/twitter" className="text-gray-400 transition-colors hover:text-gray-200">
            <FaTwitter className="h-5 w-5" />
          </Link>
          <Link aria-label="GitHub" href="/github" className="text-gray-400 transition-colors hover:text-gray-200">
            <FaGithub className="h-5 w-5" />
          </Link>
          <Link aria-label="Discord" href="/discord" className="text-gray-400 transition-colors hover:text-gray-200">
            <FaDiscord className="h-5 w-5" />
          </Link>
        </div>
        <p className="mt-10 text-center text-xs leading-5 text-gray-500">
          &copy; {new Date().getFullYear()} Serrbi Inc. {t("copyright")}
        </p>
      </div>
    </footer>
  );
}

function FooterList(props: {
  title: string;
  items: { name: string; href: string; target?: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold leading-6 text-gray-100">{props.title}</h3>
      <ul className="mt-6 space-y-4">
        {props.items.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              target={item.target}
              prefetch={item.target !== "_blank"}
              className="text-sm leading-6 text-gray-400 transition-colors hover:text-gray-100"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SiteFooter;


