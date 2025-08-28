"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"



export function Providers({ children }: { children: React.ReactNode }) {
  
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="theme"  // optional, resets any old key names
    >
      {children}
    </NextThemesProvider>
   
  )
}
