"use client";

import Link from "next/link";
import { FaTwitter, FaGithub, FaDiscord } from "react-icons/fa";
import { useTranslations } from "next-intl";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@workspace/ui/components/collapsible";

const navigation = {
  product: [
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
  company: [
    { key: "about", href: "/about" },
  ],
  legal: [
    { key: "terms", href: "/terms" },
    { key: "privacy", href: "/privacy" },
  ],
};

export function SiteFooter() {
  const t = useTranslations("Footer");
  return (
    <footer className="relative">
      <div className="mx-auto w-full overflow-hidden rounded-2xl bg-[#0b0b0f] px-6 py-20 text-gray-300 sm:px-8 sm:py-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 xl:col-span-2 xl:mt-0">
          <FooterGroup title={t("headings.product")} items={navigation.product.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          <FooterGroup title={t("headings.useCases")} items={navigation.useCases.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          <FooterGroup title={t("headings.company")} items={navigation.company.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          <FooterGroup title={t("headings.legal")} items={navigation.legal.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
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

function FooterGroup(props: {
  title: string;
  items: { name: string; href: string; target?: string }[];
}) {
  return (
    <div>
      {/* Mobile: collapsible */}
      <div className="md:hidden">
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left text-sm font-semibold leading-6 text-gray-100">
            {props.title}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-3">
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
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop: static list */}
      <div className="hidden md:block">
        <FooterList title={props.title} items={props.items} />
      </div>
    </div>
  );
}

export default SiteFooter;


