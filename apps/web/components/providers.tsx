"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"



export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      forcedTheme="light"      // always light
      enableSystem={false}     // ignore OS theme
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  
  )
}
