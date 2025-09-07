import { Inter } from "next/font/google";

import "@workspace/ui/globals.css";
import "@mdxeditor/editor/style.css"
import { Toaster } from "@workspace/ui/components/sonner";

import { SessionProvider } from "next-auth/react";
import { Providers } from "@/components/providers";
import Provider from "@/app/_trpc/provider";

import { Navbar } from "@/components/navbar";
import { MobileNavbar } from "@/components/mobile-navbar";
import { Container } from "@workspace/ui/components/container";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${fontSans.variable} font-sans antialiased`}>
          <Provider>
            <Providers>
              <Navbar  />
              <MobileNavbar />
              <main className="pt-10 pb-20 mb-4 md:pb-4">
                <Container>{children}</Container>
              </main>
              <Toaster />
            </Providers>
          </Provider>
        </body>
      </html>
    </SessionProvider>
  );
}
