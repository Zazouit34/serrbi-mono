"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@workspace/ui/components/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/login");

  // No sidebar on /login or when not authenticated
  if (isLogin || status !== "authenticated") {
    return <div className="px-4 md:px-6 lg:px-8">{children}</div>;
  }

  // Authenticated: show admin sidebar layout
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="pt-4">
        <div className="px-4 md:px-6 lg:px-8">
          <SidebarTrigger />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
