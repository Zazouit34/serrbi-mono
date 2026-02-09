"use client";

import Link from "next/link";
import { FaLinkedin , FaInstagram } from "react-icons/fa";
import { AiFillTikTok } from "react-icons/ai"

import { useTranslations } from "next-intl";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@workspace/ui/components/collapsible";
import { isSecondaryClient } from "@/lib/domain";

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
    { key: "privacy", href: "/privacy" },
  ],
};

export function SiteFooter() {
  const t = useTranslations("Footer");
  const isSecondary = isSecondaryClient();
  const productItems = (isSecondary
    ? navigation.product.filter((i) => !["services", "tasks"].includes(i.key))
    : navigation.product
  ).map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }));
  return (
    <footer className="relative">
      <div className="mx-auto w-full overflow-hidden rounded-t-2xl bg-[#0b0b0f] px-6 pt-20 text-gray-300 sm:px-8 sm:pt-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 xl:col-span-2 xl:mt-0">
          <FooterGroup title={t("headings.product")} items={productItems} />
          <FooterGroup title={t("headings.support")} items={navigation.support.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          <FooterGroup title={t("headings.company")} items={navigation.company.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
          <FooterGroup title={t("headings.resources")} items={navigation.resources.map((i) => ({ name: t(`links.${i.key}`), href: i.href, target: (i as any).target }))} />
        </div>

        <div className="flex gap-6 justify-center mt-16">
          <Link aria-label="Tiktok" href="https://www.tiktok.com/@serrbi.ma" className="text-gray-400 transition-colors hover:text-gray-200">
            <AiFillTikTok className="w-5 h-5" />
          </Link>
          <Link aria-label="Instagram" href="https://www.instagram.com/serrbi.ma/" className="text-gray-400 transition-colors hover:text-gray-200">
            <FaInstagram  className="w-5 h-5" />
          </Link>
          <Link aria-label="LinkedIn" href="https://www.linkedin.com/company/serrbi" className="text-gray-400 transition-colors hover:text-gray-200">
            <FaLinkedin  className="w-5 h-5" />
          </Link>
        </div>
        <p className="mt-10 mb-4 text-xs leading-5 text-center text-gray-500">
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
          <CollapsibleTrigger className="flex justify-between items-center py-2 w-full text-sm font-semibold leading-6 text-left text-gray-100">
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
