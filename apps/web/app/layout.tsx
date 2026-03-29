import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "@workspace/ui/globals.css";
import "@mdxeditor/editor/style.css";
import { Toaster } from "@workspace/ui/components/sonner";
import "../polyfills.js";

import { SessionProvider } from "next-auth/react";
import { Providers } from "@/components/providers";
import Provider from "@/app/_trpc/provider";
import { Navbar } from "@/components/navbar";
import { MobileNavbar } from "@/components/mobile-navbar";
import { SiteFooter } from "@/components/ui/site-footer";
import { Container } from "@workspace/ui/components/container";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });

const domain = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || "serrbi.ma";
const baseUrl = `https://${domain}`;

export async function generateMetadata() {
  const locale = await getLocale();
  const messages = await getMessages();

  const siteTitle =
    (messages as any)?.SEO?.siteTitle ||
    (locale === "fr"
      ? "Serrbi — Emplois, Services & Tâches"
      : locale === "ar"
      ? "سيربي — وظائف، خدمات، مهام"
      : "Serrbi — Jobs, Services & Tasks");

  const description =
    (messages as any)?.Hero?.description ||
    "Serrbi is a unified marketplace for jobs, services and tasks with AI matching and a Resume ATS analyzer.";

  return {
    manifest: "/manifest.json",
    themeColor: "#ff040E",
    metadataBase: new URL(baseUrl),
    title: {
      default: siteTitle,
      template: "%s | Serrbi",
    },
    description,
    alternates: {
      canonical: baseUrl,
      languages: {
        "x-default": baseUrl,
        fr: baseUrl,
        en: baseUrl,
        ar: baseUrl,
      },
    },
    openGraph: {
      type: "website",
      url: baseUrl,
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
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                url: baseUrl,
                name: "Serrbi",
                potentialAction: {
                  "@type": "SearchAction",
                  target: `${baseUrl}/jobs?search={search_term_string}`,
                  "query-input": "required name=search",
                },
              }),
            }}
          />
          <NextIntlClientProvider
            messages={messages}
            locale={locale}
            timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
          >
            <Provider>
              <Providers>
                <Navbar />
                <MobileNavbar />
                <main className="pt-2 pb-20 md:pt-10 md:pb-4">
                  <Container>{children}</Container>
                </main>
                <SiteFooter />
                <Toaster />
              </Providers>
            </Provider>
          </NextIntlClientProvider>
        </body>
      </html>
    </SessionProvider>
  );
}