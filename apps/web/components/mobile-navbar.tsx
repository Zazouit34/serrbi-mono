"use client";

import Link from "next/link";
import { HomeIcon, SearchIcon, HeartIcon } from "lucide-react";
import { UserMenuMobile } from "./user-menu-mobile";

/**
 * Bottom mobile navbar (visible on small screens only).
 * Use this component in your root layout (just before </body>) or in your pages.
 * It has md:hidden so it won't appear on desktop.
 */
export function MobileNavbar() {
  const itemClass =
    "flex flex-col gap-1 justify-center items-center text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50";

  return (
    <nav className="flex fixed right-0 bottom-0 left-0 z-50 justify-around items-center w-full h-16 bg-white border-t shadow-t dark:bg-gray-900 dark:shadow-t-gray-800 md:hidden">
      <Link href="/" prefetch={false} className={itemClass}>
        <HomeIcon className="w-6 h-6" />
        <span className="text-xs">Home</span>
      </Link>

      <Link href="/jobs" prefetch={false} className={itemClass}>
        <SearchIcon className="w-6 h-6" />
        <span className="text-xs">Explore</span>
      </Link>

      <Link href="/favorites" prefetch={false} className={itemClass}>
        <HeartIcon className="w-6 h-6" />
        <span className="text-xs">Favorites</span>
      </Link>

      {/* Profile / User menu (dropdown) */}
      <UserMenuMobile />
    </nav>
  );
}
