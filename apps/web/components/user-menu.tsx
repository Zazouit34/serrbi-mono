"use client";
import { User, LogOut, LogIn, Heart, Wallet, Zap } from "lucide-react";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
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
          <AvatarFallback className="bg-rose-500">
            <User className="text-white size-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="center">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href="/favorites"
              className="flex items-center w-full cursor-pointer"
            >
              <Heart className="mr-2 size-4" />
              Favorites
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/subscription"
              className="flex items-center w-full cursor-pointer"
            >
              <Wallet className="mr-2 size-4" />
              Plans
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/account/auto-apply"
              className="flex items-center w-full cursor-pointer"
            >
              <Zap className="mr-2 size-4" />
              Auto Apply
            </Link>
          </DropdownMenuItem>
        
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 size-4" />
          Log out
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
      Log in / Sign up
    </Link>
  );
}
