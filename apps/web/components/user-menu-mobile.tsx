"use client";

import Link from "next/link";
import { User, LogOut, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { Avatar, AvatarImage, AvatarFallback } from "@workspace/ui/components/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { logout } from "@/lib/actions/auth";

/**
 * Mobile-friendly user menu used inside the bottom MobileNavbar.
 * - Shows skeleton while loading
 * - If logged out: renders a compact Log in link (with callbackUrl)
 * - If logged in: renders Avatar as the trigger and mobile menu items
 */
export function UserMenuMobile() {
  const t = useTranslations("UserMenuMobile");
  const pathname = usePathname();
  const { user, status } = useCurrentUser();

  if (status === "loading") {
    return <Skeleton className="w-8 h-8 rounded-full" />;
  }

  if (!user) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
        prefetch={false}
        className="flex flex-col gap-1 justify-center items-center text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
      >
        <LogIn className="w-6 h-6" />
        <span className="text-xs">{t("login")}</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("openAria")}
          className="flex flex-col gap-1 justify-center items-center text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
        >
          <Avatar className="w-6 h-6">
            <AvatarImage src={user?.image || ""} />
            <AvatarFallback className="bg-black">
              <User className="text-white size-4" />
            </AvatarFallback>
          </Avatar>
          <span className="text-xs">{t("profile")}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="center" className="w-44">
        <DropdownMenuItem asChild>
          <Link href="/account/auto-apply">{t("autoApply")}</Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="account/billing">{t("billing")}</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 size-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
