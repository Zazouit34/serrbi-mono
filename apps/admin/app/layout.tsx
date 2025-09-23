import { Inter } from "next/font/google";

import "./global.css"; 
import { Toaster } from "@workspace/ui/components/sonner";
import Provider from "@/app/_trpc/provider";
import { SessionProvider } from "next-auth/react";
import { AdminShell } from "@/components/admin-shell";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${fontSans.variable} font-sans antialiased bg-gray-50`}>
          <Provider>
            <AdminShell>{children}</AdminShell>
            <Toaster />
          </Provider>
        </body>
      </html>
    </SessionProvider>
  );
}


