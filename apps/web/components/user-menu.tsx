'use client'
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Image from "next/image"
import { User, LogIn } from "lucide-react"
import { auth } from "@/auth"
import { logout } from "@/lib/actions/auth"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export async function UserMenu() {
  const session = await auth()

  const userName = session?.user?.name;
  const userEmail = session?.user?.email;
  const userImage = session?.user?.image;

  if (!session?.user) {
    // Show login/signup button if not logged in
    // Import Link, cn, buttonVariants, and LogIn at the top of the file if not already imported
    // (Assume these are available as in navbar.tsx)
    return (
      <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden px-3 md:flex")}>
        <LogIn className="mr-2 size-4" />
        Log in / Sign up
      </Link>
    )
  }

  // If logged in, show dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full">
          {userImage ? (
            <Image src={userImage} alt={userName ?? ""} width={32} height={32} />
          ) : (
            <User className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="flex flex-col space-y-1">
          <span className="text-sm font-medium leading-none">{userName}</span>
          <span className="text-xs leading-none text-muted-foreground">{userEmail}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Billing
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Keyboard shortcuts
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Team</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Email</DropdownMenuItem>
                <DropdownMenuItem>Message</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>More...</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Support</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
  }
  

