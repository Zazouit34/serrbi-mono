"use client";
import { User, LogOut, LogIn, Heart, Wallet, Zap, FileCog, FileText, TrendingUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";

export function UserMenu() {
  const t = useTranslations("UserMenu");
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  // Show nothing while loading (no skeleton)
  if (status === "loading") return null;

  return user ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src={user?.image || ""} />
          <AvatarFallback className="bg-black">
            <User className="text-white size-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="center">
        <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
        <DropdownMenuGroup>
        <DropdownMenuItem asChild>
            <Link
              href="/account/auto-apply"
              className="flex items-center w-full cursor-pointer"
            >
              <FileCog className="mr-2 size-4" />
              
              {t("autoApply")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/resume-analyzer"
              className="flex items-center w-full cursor-pointer"
            >
              <FileText className="mr-2 size-4" />
              {t("resumeAnalyzer")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/career-switch"
              className="flex items-center w-full cursor-pointer"
            >
              <TrendingUp className="mr-2 size-4" />
              {t("careerSwitch")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/favorites"
              className="flex items-center w-full cursor-pointer"
            >
              <Heart className="mr-2 size-4" />
              {t("favorites")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/subscription"
              className="flex items-center w-full cursor-pointer"
            >
              <Zap className="mr-2 size-4" />
              
              {t("plans")}
            </Link>
          </DropdownMenuItem>
        
          <DropdownMenuItem asChild>
            <Link
              href="/account/billing"
              className="flex items-center w-full cursor-pointer"
            >
              <Wallet className="mr-2 size-4" />
              {t("billing")}
            </Link>
          </DropdownMenuItem>
        
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 size-4" />
          {t("logout")}
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Link
      href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "hidden px-3 md:flex"
      )}
    >
      <LogIn className="mr-2 size-4" />
      {t("loginCta")}
    </Link>
  );
}
