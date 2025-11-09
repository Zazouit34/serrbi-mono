"use client";

import * as React from "react";
import { useState, useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@workspace/ui/lib/utils";
import { Globe2, CircleCheckIcon, CircleIcon, Wallet, Zap, Menu } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@workspace/ui/components/navigation-menu";
import { Container } from "@workspace/ui/components/container";
import { useTranslations } from "next-intl";
import { SerrbiLogo } from "./SerrbiLogo";
import { UserMenu } from "./user-menu"; // 👈 your existing user menu component
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { isSecondaryClient } from "@/lib/domain";

const DEFAULT_LINKS = [
  { href: "/jobs", key: "jobs", image: "/images/jobs.png" },
  { href: "/services", key: "services", image: "/images/services.png" },
  { href: "/tasks", key: "tasks", image: "/images/tasks.png" },
];

const LINKS = [
  { href:"/subscription", key: "plans", icon: Wallet },
  { href:"/account/auto-apply", key: "autoApply", icon: Zap },
]

const DEFAULT_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

export function Navbar() {
  const t = useTranslations("Navbar");
  const [selectedLang, setSelectedLang] = React.useState("en");
  const pathname = usePathname();
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const isSecondary = isSecondaryClient();
  const NAV_LINKS = React.useMemo(
    () => (isSecondary ? [] : DEFAULT_LINKS),
    [isSecondary]
  );

  useEffect(() => {
    // Initialize selected language from cookie
    try {
      const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith("locale="))
        ?.split("=")[1];
      if (cookieValue === "fr" || cookieValue === "ar" || cookieValue === "en") {
        setSelectedLang(cookieValue);
      }
    } catch {}

    const handleScroll = () => {
      setScrolled(window.scrollY > 10); // trigger after small scroll
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLanguageSelect = (code: string) => {
    setSelectedLang(code);
    // Persist locale in cookie and refresh to re-render Server Components with new messages
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `locale=${code}; path=/; max-age=${oneYear}; samesite=lax`;
    router.refresh();
  };

  return (
    <>
      {/* Desktop navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 hidden md:block">
        <Container className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
          {/* left */}
          <div className="flex items-center">
            <Link href="/" className="hidden gap-2 items-center md:flex">
              <SerrbiLogo className="w-auto h-6" />
            </Link>
          </div>

          {/* center links */}
          <div className="flex justify-center items-center">
            <NavigationMenu
              viewport={false}
              className="hidden justify-center md:flex"
            >
              <NavigationMenuList>
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  const visibleLabel = t(link.key as any);

                  return (
                    <NavigationMenuItem key={link.href}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex relative flex-row gap-3 items-center px-3 py-2 transition-all duration-300 group",
                            isActive
                              ? "font-semibold text-black scale-105"
                              : "text-gray-500 hover:scale-105"
                          )}
                        >
                          <Image
                            src={link.image}
                            alt={visibleLabel}
                            width={40}
                            height={40}
                            priority={link.href === "/jobs"}
                          />
                          <span className="relative">{visibleLabel}</span>

                          {/* underline */}
                          <div
                            className={cn(
                              "absolute bottom-0 left-0 w-full bg-black transition-transform duration-300 ease-in-out h-[2px]",
                              isActive ? "scale-x-100" : "scale-x-0"
                            )}
                          />
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* right side: language + user menu */}
          <div className="flex gap-2 justify-self-end items-center">
            {/* 👤 User menu */}
            <UserMenu />
            {/* Language selector */}
            <NavigationMenu viewport={false}>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="px-2">
                    <Globe2 className="mr-2 size-4" />
                    {DEFAULT_LANGUAGES.find((l) => l.code === selectedLang)
                      ?.label ?? selectedLang.toUpperCase()}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-4">
                      <li>
                        {DEFAULT_LANGUAGES.map((lang) => (
                          <NavigationMenuLink asChild key={lang.code}>
                            <Link
                              href="#"
                              className="flex-row gap-2 items-center"
                              onClick={(e) => {
                                e.preventDefault();
                                handleLanguageSelect(lang.code);
                              }}
                            >
                              {selectedLang === lang.code ? (
                                <CircleCheckIcon />
                              ) : (
                                <CircleIcon />
                              )}
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

      {/* Mobile navbar */}
      <header className="sticky top-0 z-50 w-full shadow-sm backdrop-blur bg-background/80 md:hidden">
        {/* Top row: burger + logo + globe */}
        <div className="flex justify-between items-center px-4 py-2">
          {/* Burger menu using DropdownMenu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2">
                <Menu className="w-6 h-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {LINKS.map((link) => (
                <DropdownMenuItem key={link.href} className="p-0">
                  <Link href={link.href} className="flex items-center gap-2 w-full px-2 py-1.5">
                    {link.icon && <link.icon className="size-4" />}
                    {t(link.key as any)}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Center logo */}
          <Link href="/">
            <SerrbiLogo className="h-6" />
          </Link>

          {/* Language menu (just globe icon) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-2 py-2 rounded-md hover:bg-gray-100">
                <Globe2 className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              {DEFAULT_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className="flex gap-2 items-center"
                >
                  {selectedLang === lang.code ? (
                    <CircleCheckIcon className="size-4" />
                  ) : (
                    <CircleIcon className="size-4" />
                  )}
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bottom row: scroll-hiding icons */}
        <nav className="overflow-x-auto relative w-full no-scrollbar">
          <div className="flex justify-between items-center px-4 w-full">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group flex relative flex-col justify-center items-center px-4 flex-1 text-xs font-medium transition-all duration-300 hover:text-black data-[active=true]:text-black",
                  scrolled ? "py-2" : "py-3"
                )}
                data-active={pathname === link.href}
              >
                <Image
                  src={link.image}
                  alt={t(link.key as any)}
                  width={40}
                  height={40}
                  className={cn(
                    "mb-1 transition-all duration-300 ease-in-out",
                    scrolled
                      ? "opacity-0 scale-75 h-0 mb-0"
                      : "opacity-100 scale-100"
                  )}
                />
                {t(link.key as any)}
                <div
                  className="absolute bottom-0 left-1/4 w-1/2 h-0.5 bg-black transform scale-x-0 
            transition-transform duration-300 ease-in-out 
            group-hover:scale-x-100 group-data-[active=true]:scale-x-100 
            sm:left-0 sm:w-full sm:h-1"
                />
              </Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}
