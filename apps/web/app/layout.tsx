import { Inter } from "next/font/google"

import "@workspace/ui/globals.css"
import { Toaster } from "@workspace/ui/components/sonner"

import { Providers } from "@/components/providers"
import Provider from "@/app/_trpc/provider"

import { Navbar } from "@/components/navbar"
import { Container } from "@workspace/ui/components/container"

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} font-sans antialiased`}
      >
        <Provider>
        <Providers>
          <Navbar />
          <main>
            <Container>
              
                {children}
              
            </Container>
          </main>
          <Toaster />
        </Providers>
        </Provider>
      </body>
    </html>
  )
}
