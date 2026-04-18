"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquare, Trash2, Clock, ArrowLeft, Plus, MoreVertical, Pencil } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover";
import { trpc } from "@/app/_trpc/client";

function formatRelativeTime(ts: Date | string, locale: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (locale === "fr") {
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
  if (locale === "ar") {
    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days === 1) return "أمس";
    if (days < 7) return `منذ ${days} أيام`;
    return new Date(ts).toLocaleDateString("ar-MA", { day: "numeric", month: "short" });
  }
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChatsPage() {
  const t = useTranslations("ChatsPage");
  const locale = useLocale();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoggedIn = !!session?.user?.email;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const utils = trpc.useUtils();
  const listQuery = trpc.chatSession.list.useQuery(undefined, {
    enabled: isLoggedIn,
  });
  const deleteMutation = trpc.chatSession.delete.useMutation({
    onSuccess: () => utils.chatSession.list.invalidate(),
  });
  const renameMutation = trpc.chatSession.rename.useMutation({
    onSuccess: () => utils.chatSession.list.invalidate(),
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/chats")}`);
    }
  }, [status, router]);

  const entries = listQuery.data ?? [];

  const handleOpen = (id: string) => {
    if (editingId) return;
    router.push(`/c/${id}`);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleNewChat = () => {
    router.push("/");
  };

  const handleStartRename = (entry: { id: string; title: string }) => {
    setEditingId(entry.id);
    setEditValue(entry.title);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      renameMutation.mutate({ id, title: trimmed });
    }
    setEditingId(null);
    setEditValue("");
  };

  if (status === "loading" || listQuery.isLoading) {
    return (
      <div className="px-4 py-12 mx-auto max-w-2xl">
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 mx-auto max-w-2xl md:pt-10">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3 items-center">
          <button
            onClick={() => router.back()}
            className="flex justify-center items-center w-9 h-9 rounded-full border transition border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
            <p className="text-sm text-slate-500">
              {entries.length > 0
                ? t("subtitle", { count: entries.length })
                : t("empty")}
            </p>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("newChat")}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-center">
          <div className="flex justify-center items-center mb-4 w-16 h-16 rounded-2xl bg-slate-100">
            <MessageSquare className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-base font-medium text-slate-700">{t("noChats")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("noChatsHint")}</p>
          <button
            onClick={handleNewChat}
            className="mt-5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {t("startChat")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isEditing = editingId === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => handleOpen(entry.id)}
                className="group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3.5 text-left transition hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSaveRename(entry.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(entry.id);
                        if (e.key === "Escape") { setEditingId(null); setEditValue(""); }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    />
                  ) : (
                    <p className="text-sm font-medium truncate text-slate-900">
                      {entry.title}
                    </p>
                  )}
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex gap-1 items-center">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(entry.updatedAt, locale)}
                    </span>
                  </div>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex justify-center items-center mt-1 w-7 h-7 rounded-md transition shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    className="p-1 w-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleStartRename(entry)}
                      className="flex gap-2 items-center px-3 py-2 w-full text-sm rounded-md transition text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("rename")}
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="flex gap-2 items-center px-3 py-2 w-full text-sm text-red-600 rounded-md transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("delete")}
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
