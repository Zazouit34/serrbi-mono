"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import { Globe2, CircleCheckIcon, CircleIcon } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@workspace/ui/components/navigation-menu";
import { Container } from "@workspace/ui/components/container";
import { SerrbiLogo } from "./SerrbiLogo";
import { UserMenu } from "./user-menu"; // 👈 your existing user menu component

const DEFAULT_LINKS = [
  { href: "/jobs", label: "Jobs", image: "/images/jobs.png" },
  {
    href: "/services",
    label: "Services",
    image: "/images/services.png"
  },
  { href: "/tasks", label: "Tasks", image: "/images/tasks.png" },
];

const DEFAULT_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

export function Navbar() {
  const [selectedLang, setSelectedLang] = React.useState("en");
  const pathname = usePathname();

  const handleLanguageSelect = (code: string) => {
    setSelectedLang(code);
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
                {DEFAULT_LINKS.map((link) => {
                  const isActive = pathname === link.href;

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
                          <img
                            src={link.image}
                            alt={link.label}
                            className="size-10"
                          />
                          <span className="relative">
                            {link.label}
                          </span>

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
        {/* Links row (no border) */}
        <nav className="overflow-x-auto relative w-full no-scrollbar">
          <div className="flex justify-between items-center px-4 w-full">
            {DEFAULT_LINKS.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex relative flex-col justify-center items-center px-4 py-3 flex-1 text-xs font-medium transition-colors hover:text-black group data-[active=true]:text-black"
                data-active={pathname === link.href}
              >
                <img
                  src={link.image}
                  alt={link.label}
                  className="mb-1 size-10"
                />
                {link.label}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-black transform scale-x-0 transition-transform duration-300 ease-in-out group-hover:scale-x-100 data-[active=true]:scale-x-100" />
                </Link>
              ))}
              
            </div>
          </nav>
      </header>
    </>
  );
}
