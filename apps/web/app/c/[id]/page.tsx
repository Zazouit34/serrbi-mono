"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@workspace/ui/lib/utils";
import { HeroSearchBar, type ChatMessage } from "@/components/ui/hero-search-bar";
import { trpc } from "@/app/_trpc/client";

export default function ChatSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = !!session?.user?.email;

  const chatQuery = trpc.chatSession.getById.useQuery(
    { id: params.id },
    { enabled: isLoggedIn && !!params.id, retry: false },
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/c/${params.id}`)}`);
    }
  }, [status, params.id, router]);

  useEffect(() => {
    if (chatQuery.error) {
      router.replace("/");
    }
  }, [chatQuery.error, router]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (status === "loading" || chatQuery.isLoading || (isLoggedIn && chatQuery.isPending)) {
    return (
      <div className="mx-auto flex min-h-[60dvh] w-full max-w-3xl items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  const messages = (chatQuery.data?.messages as ChatMessage[]) ?? [];

  return (
    <div className={cn("flex flex-col -mx-4 md:mx-0")}>
      <div className="mx-auto flex w-full flex-col items-center h-[calc(100dvh-14.5rem)] justify-start gap-2 px-2 pt-1 pb-1 md:h-[calc(100dvh-5rem)] md:px-0 md:py-3">
        <div className="w-full flex-1 min-h-0">
          <HeroSearchBar
            onChatExpandedChange={() => {}}
            sessionId={params.id}
            initialMessages={messages}
          />
        </div>
      </div>
    </div>
  );
}
