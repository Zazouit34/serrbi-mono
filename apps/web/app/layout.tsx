import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { headers } from "next/headers";

import "@workspace/ui/globals.css";
import "@mdxeditor/editor/style.css";
import { Toaster } from "@workspace/ui/components/sonner";

// Polyfill for Node 18 compatibility
import "../polyfills.js";

import { SessionProvider } from "next-auth/react";
import { Providers } from "@/components/providers";
import Provider from "@/app/_trpc/provider";

import { Navbar } from "@/components/navbar";
import { MobileNavbar } from "@/components/mobile-navbar";
import { Container } from "@workspace/ui/components/container";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });

const primary = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || "serrbi.ma";
const secondary = process.env.NEXT_PUBLIC_SECONDARY_DOMAIN || "serrbi.com";

export async function generateMetadata() {
  const hdrs = await headers();
  const host = (hdrs.get("host") || primary).toLowerCase();
  const isSecondary = host.includes(secondary);
  const base = new URL(`https://${isSecondary ? secondary : primary}`);

  return {
    manifest: "/manifest.json",
    themeColor: "#ff040E",
    metadataBase: base,
    title: {
      default: "Serrbi — Jobs, Services & Tasks",
      template: "%s | Serrbi",
    },
    description:
      "Serrbi is a unified marketplace for jobs, services and tasks with AI matching, Auto-Apply and a Resume ATS analyzer.",
    alternates: {
      canonical: base.toString(),
      languages: {
        "x-default": `https://${primary}`,
        fr: `https://${primary}`,
        en: `https://${secondary}`,
      },
    },
    openGraph: {
      type: "website",
      url: base.toString(),
      siteName: "Serrbi",
      images: [{ url: "/og/og-default.png", width: 1200, height: 630, alt: "Serrbi" }],
    },
    twitter: {
      card: "summary_large_image",
    },
  } as const;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <SessionProvider>
      <html lang={locale} dir={dir} suppressHydrationWarning>
        <body className={`${fontSans.variable} font-sans antialiased overflow-x-hidden`}>
          {/* WebSite JSON-LD (server rendered) */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                url: `https://${primary}`,
                name: "Serrbi",
                potentialAction: {
                  "@type": "SearchAction",
                  target: `https://${primary}/jobs?search={search_term_string}`,
                  "query-input": "required name=search",
                },
              }),
            }}
          />
          <NextIntlClientProvider messages={messages} locale={locale} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
            <Provider>
              <Providers>
                <Navbar />
                <MobileNavbar />
                <main className="pt-4 pb-20 mb-4 md:pt-10 md:pb-4">
                  <Container>{children}</Container>
                </main>
                <Toaster />
              </Providers>
            </Provider>
          </NextIntlClientProvider>
        </body>
      </html>
    </SessionProvider>
  );
}
