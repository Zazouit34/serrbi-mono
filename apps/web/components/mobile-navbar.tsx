"use client";

import Link from "next/link";
import { HomeIcon, SearchIcon, HeartIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { UserMenuMobile } from "./user-menu-mobile";

export function MobileNavbar() {
  const t = useTranslations("Navbar");
  const itemClass =
    "flex flex-col gap-1 justify-center items-center text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50";

  const [visible, setVisible] = useState(true);
  const lastYRef = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastYRef.current;
      if (Math.abs(delta) > 4) {
        setVisible(y < 32 ? true : delta > 0);
        lastYRef.current = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`flex fixed right-0 bottom-0 left-0 z-50 justify-around items-center w-full h-14 bg-white border-t shadow-t dark:bg-gray-900 dark:shadow-t-gray-800 md:hidden transition-transform duration-200 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link href="/" prefetch={false} className={itemClass}>
        <HomeIcon className="w-6 h-6" />
        <span className="text-xs">{t("home")}</span>
      </Link>

      <Link href="/jobs" prefetch={false} className={itemClass}>
        <SearchIcon className="w-6 h-6" />
        <span className="text-xs">{t("explore")}</span>
      </Link>

      <Link href="/favorites" prefetch={false} className={itemClass}>
        <HeartIcon className="w-6 h-6" />
        <span className="text-xs">{t("favorites")}</span>
      </Link>

      <UserMenuMobile />
    </nav>
  );
}
