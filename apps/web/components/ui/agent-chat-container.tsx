"use client";

import type { RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { FiPaperclip } from "react-icons/fi";
import { Input } from "@workspace/ui/components/input";
import { ChatContainerRoot, ChatContainerContent } from "@/components/ui/chat-container";
import { Message, MessageAvatar } from "@/components/ui/message";
import { Markdown } from "@/components/ui/markdown";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";
import { ThinkingBar } from "@/components/ui/thinking-bar";
import { SiGoogleassistant } from "react-icons/si";

type TabType = "jobs" | "services" | "tasks";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content?: string;
  thinking?: boolean;
  kind?: "text" | "results" | "suggestions";
  results?: {
    key: string;
    query: string;
    type: TabType;
    items: any[];
    isLoading: boolean;
  };
  relatedPrompts?: string[];
  suggestionsForKey?: string;
  upgradeUrl?: string;
};

type AgentChatContainerProps = {
  chatExpanded: boolean;
  messages: ChatMessage[];
  chatInput: string;
  placeholder: string;
  dir: "ltr" | "rtl";
  isSearching: boolean;
  isAgentWorking: boolean;
  pinnedIntent: TabType | null;
  userInitial?: string;
  chatInputRef: RefObject<HTMLInputElement | null>;
  labels: {
    searching: string;
    thinking: string;
    noResults: string;
    related: string;
    jobs: string;
    services: string;
    tasks: string;
  };
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onPinnedIntentClear: () => void;
  onSuggestionSelect: (prompt: string, upgradeUrl?: string) => void;
  onResumeAttach: (file: File) => void;
  resumeAttachLabel?: string;
  resumeAttachStatusText?: string;
};

function SuggestionList({
  prompts,
  title,
  onSelect,
}: {
  prompts: string[];
  title?: string;
  onSelect: (prompt: string) => void;
}) {
  if (!Array.isArray(prompts) || prompts.length === 0) return null;

  return (
    <div className="relative w-full">
      {title ? (
        <div className="mb-1 flex items-center gap-2 text-slate-500">
          <SiGoogleassistant className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
      ) : null}
      <div className="mt-2 space-y-1">
        {prompts.slice(0, 6).map((prompt, index) => (
          <button
            key={`${index}-${prompt}`}
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 group"
            onClick={() => onSelect(prompt)}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-700" />
            <span className="text-slate-800">{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AgentChatContainer({
  chatExpanded,
  messages,
  chatInput,
  placeholder,
  dir,
  isSearching,
  isAgentWorking,
  pinnedIntent,
  userInitial,
  chatInputRef,
  labels,
  onInputChange,
  onSubmit,
  onPinnedIntentClear,
  onSuggestionSelect,
  onResumeAttach,
  resumeAttachLabel,
  resumeAttachStatusText,
}: AgentChatContainerProps) {
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onResumeAttach(file);
    e.currentTarget.value = "";
  };

  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 ${
        chatExpanded ? "min-h-0 flex-1" : "min-h-[120px]"
      }`}
    >
      {chatExpanded && (
        <ChatContainerRoot className="min-h-0 flex-1 px-3 pt-3">
          <ChatContainerContent className="space-y-3">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <Message
                  key={message.id}
                  className={`min-w-0 justify-start ${isAssistant ? "pl-8 md:pl-10" : "items-center"}`}
                >
                  {message.role === "user" ? (
                    <MessageAvatar
                      fallback={userInitial || "U"}
                      className="h-6 w-6 bg-slate-100 text-[10px] text-slate-700"
                    />
                  ) : null}
                  {isAssistant ? (
                    message.kind === "suggestions" ? (
                      <div className="w-full min-w-0 text-left">
                        <SuggestionList
                          prompts={message.relatedPrompts ?? []}
                          title={message.content || labels.related}
                          onSelect={(p) => onSuggestionSelect(p, message.upgradeUrl)}
                        />
                      </div>
                    ) : message.results ? (
                      <div className="w-full min-w-0 text-left text-slate-900">
                        {message.results.isLoading ? <ThinkingBar text={labels.searching} /> : null}

                        {!message.results.isLoading && message.results.items.length === 0 ? (
                          <div className="text-sm text-slate-700">{labels.noResults}</div>
                        ) : null}

                        {!message.results.isLoading && message.results.items.length > 0 && (
                          <div className="mt-3 grid grid-cols-1 gap-6 text-left md:grid-cols-3">
                            {message.results.items.map((item: any) => {
                              if (message.results?.type === "jobs") {
                                const percent =
                                  item?.resumeMatch && typeof item.resumeMatch.percent === "number"
                                    ? item.resumeMatch.percent
                                    : null;
                                const badgeTone =
                                  percent == null
                                    ? "bg-slate-100 text-slate-700"
                                    : percent >= 80
                                      ? "bg-emerald-100 text-emerald-700"
                                      : percent >= 60
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-rose-100 text-rose-700";
                                return (
                                  <div key={item.id} className="space-y-2">
                                    <JobCard className="h-full" job={item} compact />
                                    {percent != null ? (
                                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-semibold text-slate-600">Matching score</span>
                                          <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${badgeTone}`}>
                                            {percent}%
                                          </span>
                                        </div>
                                        {typeof item?.resumeMatch?.explanation === "string" &&
                                        item.resumeMatch.explanation.trim() ? (
                                          <p className="mt-1 text-xs leading-5 text-slate-700">
                                            {item.resumeMatch.explanation}
                                          </p>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              }
                              if (message.results?.type === "services") {
                                return (
                                  <Link
                                    key={item.id}
                                    href={`/services?serviceCategory=${encodeURIComponent(item.serviceCategory ?? "")}`}
                                  >
                                    <ServiceCard service={item} className="h-full" />
                                  </Link>
                                );
                              }
                              return <TaskCard key={item.id} task={item} className="h-full" />;
                            })}
                          </div>
                        )}

                        {!message.results.isLoading && (message.content ?? "").trim() ? (
                          <div className="mt-4 text-left text-slate-900 leading-6">
                            <Markdown>{message.content ?? ""}</Markdown>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="w-full min-w-0 text-left text-slate-900 leading-6">
                        {message.thinking ? <ThinkingBar text={labels.thinking} /> : <Markdown>{message.content ?? ""}</Markdown>}
                      </div>
                    )
                  ) : (
                    <div className="w-full min-w-0 text-left text-sm text-slate-900 leading-6">{message.content}</div>
                  )}
                </Message>
              );
            })}
          </ChatContainerContent>
        </ChatContainerRoot>
      )}

      <div className="sticky bottom-0 z-10 shrink-0 bg-white p-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center">
            <Input
              ref={chatInputRef}
              placeholder={placeholder}
              value={chatInput}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              className="flex-1 border-none bg-transparent px-0 text-sm text-gray-900 shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex min-h-8 items-center gap-2">
              <label
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gray-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                title={resumeAttachLabel || "Attach resume PDF"}
                aria-label={resumeAttachLabel || "Attach resume PDF"}
              >
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={onFileChange}
                />
                <FiPaperclip className="h-4 w-4" />
              </label>
              {pinnedIntent ? (
                <span
                  className={`group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    pinnedIntent === "jobs"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : pinnedIntent === "services"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {pinnedIntent === "jobs" ? labels.jobs : pinnedIntent === "services" ? labels.services : labels.tasks}
                  <button
                    type="button"
                    onClick={onPinnedIntentClear}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove selected action"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSearching || isAgentWorking}
              className="flex h-8 w-12 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-60"
            >
              <Image
                src="/icons/arrow.svg"
                alt="Send"
                width={20}
                height={20}
                className={dir === "rtl" ? "rotate-180" : ""}
              />
            </button>
          </div>
          {resumeAttachStatusText ? (
            <div className="mt-2 text-xs text-slate-600">{resumeAttachStatusText}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
