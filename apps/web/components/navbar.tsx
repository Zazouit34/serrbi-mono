"use client"

import * as React from "react"
import { usePathname } from "next/navigation";
import Link from "next/link"
import { Globe2, LogIn, CircleCheckIcon, CircleIcon, Menu } from "lucide-react"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@workspace/ui/components/navigation-menu"
import { Container } from "@workspace/ui/components/container"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { SerrbiLogo } from "./SerrbiLogo"
import { UserMenu } from "./user-menu"



const DEFAULT_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
]

export function Navbar() {
  const pathname = usePathname();

  const [selectedLang, setSelectedLang] = React.useState("en")

  const handleLanguageSelect = (code: string) => {
    setSelectedLang(code)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left Side - Mobile Menu (visible on mobile) / Logo (on desktop) */}
        <div className="flex items-center">
          {/* Mobile Hamburger Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2 md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              
              {/* Navigation Links */}
              <div className="flex flex-col mt-6 space-y-4">
                <SheetClose asChild>
                  <Link 
                    href="/agent" 
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Agent
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link 
                    href="/jobs" 
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Jobs
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link 
                    href="/talents" 
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Talents
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link 
                    href="/services" 
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Services
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link 
                    href="/projects" 
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Projects
                  </Link>
                </SheetClose>
              </div>

              <SheetFooter>
                <div className="space-y-4 w-full">
                  <Separator />
                  <SheetClose asChild>
                    <Link 
                      href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
                      className={cn(buttonVariants({ variant: "default", size: "sm" }), "w-full")}
                    >
                      <LogIn className="mr-2 size-4" />
                      Log in / Sign up
                    </Link>
                  </SheetClose>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          
          {/* Logo - Desktop only (hidden on mobile) */}
          <Link href="/" className="hidden gap-2 items-center md:flex">
            <SerrbiLogo className="w-auto h-6" />
          </Link>
        </div>

        {/* Center - Logo on mobile, Navigation on desktop */}
        <div className="flex justify-center items-center">
          {/* Mobile Logo */}
          <Link href="/" className="flex gap-2 items-center md:hidden">
            <SerrbiLogo className="w-auto h-6" />
          </Link>
          
          {/* Desktop Navigation - Hidden on mobile */}
          <NavigationMenu viewport={false} className="hidden justify-center md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/agent">Agent</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/jobs">Jobs</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/talents">Talents</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/services">Services</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/projects">Projects</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        </div>

        {/* Right Side - Login & Language */}
        <div className="flex gap-2 justify-self-end items-center">
          {/* Login button - Desktop only */}

          <UserMenu />
          {/*<Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden px-3 md:flex")}>
            <LogIn className="mr-2 size-4" />
            Log in / Sign up
          </Link>*/}

          <NavigationMenu viewport={false}>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="px-2">
                  <Globe2 className="mr-2 size-4" />
                  {DEFAULT_LANGUAGES.find((l) => l.code === selectedLang)?.label ?? selectedLang.toUpperCase()}
                </NavigationMenuTrigger>
                <NavigationMenuContent >
                  <ul className="grid w-[200px] gap-4">
                    <li>
                      {DEFAULT_LANGUAGES.map((lang) => (
                        <NavigationMenuLink asChild key={lang.code}>
                          <Link 
                            href="#" 
                            className="flex-row gap-2 items-center"
                            onClick={(e) => {
                              e.preventDefault()
                              handleLanguageSelect(lang.code)
                            }}
                          >
                            {selectedLang === lang.code ? <CircleCheckIcon /> : <CircleIcon />}
                            {lang.label}
                          </Link>
                        </NavigationMenuLink>
                      ))}
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </Container>
    </header>
  )
}
