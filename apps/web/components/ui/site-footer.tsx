"use client";

import Link from "next/link";
import { FaLinkedin , FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

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
  support: [
    { key: "Talents", href: "mailto:talents@serrbi.com", displayName: "talents@serrbi.com" },
    { key: "Support", href: "mailto:support@serrbi.com", displayName: "support@serrbi.com" },
  ],
  company: [
    { key: "about", href: "/about" },
    { key: "get in touch", href: "/contact" },
  ],
  resources: [
    { key: "careers", href: "/careers" },
    { key: "blog", href: "/blog" },
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
          <FooterGroup title={t("headings.support")} items={navigation.support.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          <FooterGroup title={t("headings.company")} items={navigation.company.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          <FooterGroup title={t("headings.resources")} items={navigation.resources.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
        </div>

        <div className="mt-16 flex justify-center gap-6">
          <Link aria-label="Twitter" href="#" className="text-gray-400 transition-colors hover:text-gray-200">
            <FaXTwitter className="h-5 w-5" />
          </Link>
          <Link aria-label="Instagram" href="#" className="text-gray-400 transition-colors hover:text-gray-200">
            <FaInstagram  className="h-5 w-5" />
          </Link>
          <Link aria-label="LinkedIn" href="#" className="text-gray-400 transition-colors hover:text-gray-200">
            <FaLinkedin  className="h-5 w-5" />
          </Link>
        </div>
        <p className="mt-10 text-center text-xs leading-5 text-gray-500">
          &copy; {new Date().getFullYear()} Serrbi. {t("copyright")}
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
