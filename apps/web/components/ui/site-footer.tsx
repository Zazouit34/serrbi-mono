"use client";

import Link from "next/link";
import { FaTwitter, FaGithub, FaDiscord } from "react-icons/fa";

const navigation = {
  main: [
    { name: "Jobs", href: "/jobs" },
    { name: "Services", href: "/services" },
    { name: "Tasks", href: "/tasks" },
    { name: "Pricing", href: "/subscription" },
  ],
  useCases: [
    { name: "Find work", href: "/jobs" },
    { name: "Hire talent", href: "/services" },
    { name: "Get tasks done", href: "/tasks" },
  ],
  compare: [
    { name: "vs Fyxer.ai", href: "/best-fyxer-alternative" },
    {
      name: "vs Perplexity Email Assistant",
      href: "/best-perplexity-email-assistant-alternative",
    },
  ],
  support: [
    { name: "Contact", href: "/contact" },
    { name: "Help Center", href: "/docs" },
    {name : "Plans", href: "/subscription"}
  ],
  company: [
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Careers", href: "/careers" },
  ],
  legal: [
    { name: "Terms", href: "/terms" },
    { name: "Privacy", href: "/privacy" },
    {
      name: "SOC2 Compliant",
      href: "https://security.getinboxzero.com",
      target: "_blank",
    },
    { name: "Sitemap", href: "/sitemap.xml" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="relative">
      <div className="mx-auto w-full overflow-hidden rounded-2xl bg-[#0b0b0f] px-6 py-20 text-gray-300 sm:px-8 sm:py-24">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5 xl:col-span-2 xl:mt-0">
          <div>
            <FooterList title="Product" items={navigation.main} />
          </div>
          <div>
            <FooterList title="Use Cases" items={navigation.useCases} />
            <div className="mt-6">
              <FooterList title="Compare" items={navigation.compare} />
            </div>
          </div>
          <div>
            <FooterList title="Support" items={navigation.support} />
          </div>
          <div>
            <FooterList title="Company" items={navigation.company} />
          </div>
          <div>
            <FooterList title="Legal" items={navigation.legal} />
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
          &copy; {new Date().getFullYear()} Serrbi Inc. All rights reserved.
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


