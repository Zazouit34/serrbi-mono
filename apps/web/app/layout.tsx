import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

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
import { SeoDefaults } from "@/components/seo/default-seo";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  manifest: "/manifest.json",
  themeColor: "#ff040E", // Serrbi red
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <SessionProvider>
      <html lang={locale} dir={dir} suppressHydrationWarning>
        <body className={`${fontSans.variable} font-sans antialiased overflow-x-hidden`}>
          <NextIntlClientProvider messages={messages} locale={locale} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
            <Provider>
              <Providers>
                <SeoDefaults />
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
