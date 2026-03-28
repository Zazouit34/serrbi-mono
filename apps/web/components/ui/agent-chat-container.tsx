"use client";

import { useRef, useEffect, type ChangeEvent, type RefObject } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FileCheck2, Search, X } from "lucide-react";
import { FiPaperclip } from "react-icons/fi";
import { ChatResumeInsight } from "@/components/ui/chat-resume-insight";
import { Progress } from "@workspace/ui/components/progress";
import { ChatContainerRoot, ChatContainerContent } from "@/components/ui/chat-container";
import { Message, MessageAvatar } from "@/components/ui/message";
import { Markdown } from "@/components/ui/markdown";
import { JobCard } from "@/components/ui/form/job/job-card";
import { ServiceCard } from "@/components/ui/form/service/service-card";
import { TaskCard } from "@/components/ui/form/task/task-card";
import { ThinkingBar } from "@/components/ui/thinking-bar";
import { SiGoogleassistant } from "react-icons/si";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

type TabType = "jobs" | "services" | "tasks";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content?: string;
  thinking?: boolean;
  kind?: "text" | "results" | "suggestions" | "resume-insight";
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
  suggestedIntentSwitch?: TabType;
  resumeUploadCta?: {
    title: string;
    description: string;
    buttonLabel: string;
  };
  resumeInsight?: {
    score: number;
    skillGaps: string[];
    improvements: string[];
    suggestedRoles?: string[];
  };
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
  inSession?: boolean;
  userInitial?: string;
  chatInputRef: RefObject<HTMLTextAreaElement | null>;
  labels: {
    searching: string;
    thinking: string;
    noResults: string;
    related: string;
    jobs: string;
    services: string;
    tasks: string;
    jobsShort?: string;
    servicesShort?: string;
    tasksShort?: string;
    cvShort?: string;
    whyPicked?: string;
    confidence?: string;
  };
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onPinnedIntentClear: () => void;
  onIntentChange?: (intent: TabType | null) => void;
  onSuggestionSelect: (prompt: string, upgradeUrl?: string, intentSwitch?: TabType) => void;
  onResumeAttach: (file: File) => void;
  resumeAttachLabel?: string;
  resumeAttachStatusText?: string;
  resumeAttachProgress?: number | null;
  resumeAttachFileName?: string;
  hasResumeAttached?: boolean;
  resumeAttachedLabel?: string;
};

function SuggestionList({
  prompts,
  title,
  onSelect,
  suggestedIntentSwitch,
}: {
  prompts: string[];
  title?: string;
  onSelect: (prompt: string, intentSwitch?: TabType) => void;
  suggestedIntentSwitch?: TabType;
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
            onClick={() => onSelect(prompt, index === 0 ? suggestedIntentSwitch : undefined)}
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
  inSession = false,
  userInitial,
  chatInputRef,
  labels,
  onInputChange,
  onSubmit,
  onPinnedIntentClear,
  onIntentChange,
  onSuggestionSelect,
  onResumeAttach,
  resumeAttachLabel,
  resumeAttachStatusText,
  resumeAttachProgress,
  resumeAttachFileName,
  hasResumeAttached,
  resumeAttachedLabel,
}: AgentChatContainerProps) {
  const t = useTranslations("HeroSearchBar");
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  // Show CV badge whenever intent is jobs (or no intent pinned — neutral)
  const showCvBadge = !pinnedIntent || pinnedIntent === "jobs";

  // Auto-scroll to bottom when new messages arrive or agent finishes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isAgentWorking]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onResumeAttach(file);
    e.currentTarget.value = "";
  };
  const openResumePicker = () => {
    resumeInputRef.current?.click();
  };

  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-xl bg-white transition-all duration-300 md:rounded-2xl ${
        chatExpanded ? "min-h-0 flex-1" : "min-h-[120px]"
      }`}
    >
      {chatExpanded && (
        <ChatContainerRoot className="min-h-0 flex-1 px-2 pt-2 md:px-3 md:pt-3">
          <ChatContainerContent className="space-y-2 md:space-y-3">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <Message
                  key={message.id}
                  className={`min-w-0 justify-start ${isAssistant ? "pl-1 md:pl-10" : "items-center"}`}
                >
                  {message.role === "user" ? (
                    <MessageAvatar
                      fallback={userInitial || "U"}
                      className="h-5 w-5 bg-slate-100 text-[9px] text-slate-700 md:h-6 md:w-6 md:text-[10px]"
                    />
                  ) : null}
                  {isAssistant ? (
                    message.kind === "resume-insight" && message.resumeInsight ? (
                      <div className="w-full min-w-0 text-left">
                        <ChatResumeInsight
                          score={message.resumeInsight.score}
                          skillGaps={message.resumeInsight.skillGaps}
                          improvements={message.resumeInsight.improvements}
                          suggestedRoles={message.resumeInsight.suggestedRoles}
                        />
                      </div>
                    ) : message.kind === "suggestions" ? (
                      <div className="w-full min-w-0 text-left">
                        <SuggestionList
                          prompts={message.relatedPrompts ?? []}
                          title={message.content || labels.related}
                          suggestedIntentSwitch={message.suggestedIntentSwitch}
                          onSelect={(p, intentSwitch) => onSuggestionSelect(p, message.upgradeUrl, intentSwitch)}
                        />
                      </div>
                    ) : message.results ? (
                      <div className="w-full min-w-0 text-left text-sm text-slate-900 md:text-base">
                        {message.results.isLoading ? <ThinkingBar text={labels.searching} /> : null}

                        {!message.results.isLoading && message.results.items.length === 0 ? (
                          <div className="text-xs text-slate-700 md:text-sm">{labels.noResults}</div>
                        ) : null}

                        {!message.results.isLoading && message.results.items.length > 0 && (
                          <div className="mt-2 flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mt-3 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:snap-none md:pb-0">
                            {message.results.items.map((item: any) => {
                              const cardWrap = "w-[72vw] min-w-[72vw] shrink-0 snap-start md:w-auto md:min-w-0 md:shrink";
                              if (message.results?.type === "jobs") {
                                return (
                                  <div key={item.id} className={cardWrap}>
                                    <JobCard className="h-full" job={item} compact />
                                  </div>
                                );
                              }
                              if (message.results?.type === "services") {
                                return (
                                  <div key={item.id} className={cardWrap}>
                                    <ServiceCard service={item} className="h-full" />
                                  </div>
                                );
                              }
                              return (
                                <div key={item.id} className={cardWrap}>
                                  <TaskCard task={item} className="h-full" />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!message.results.isLoading && (message.content ?? "").trim() ? (
                          <div className="mt-3 text-left text-xs leading-5 text-slate-900 md:mt-4 md:text-sm md:leading-6">
                            <Markdown>{message.content ?? ""}</Markdown>
                          </div>
                        ) : null}
                        {!message.results.isLoading && (message.relatedPrompts ?? []).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 md:mt-4 md:gap-2">
                            {(message.relatedPrompts ?? []).map((prompt) => (
                              <button
                                key={prompt}
                                onClick={() => onSuggestionSelect(prompt)}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 active:scale-95 md:text-xs"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        )}

                        {!message.results.isLoading && message.resumeUploadCta ? (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-700 md:mt-4 md:text-sm md:leading-6">
                            <span>✨ {message.resumeUploadCta.title}</span>
                            <button
                              onClick={openResumePicker}
                              className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 transition-colors md:text-sm"
                            >
                              {message.resumeUploadCta.buttonLabel}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="w-full min-w-0 text-left text-xs leading-5 text-slate-900 md:text-sm md:leading-6">
                        {message.thinking ? <ThinkingBar text={labels.thinking} /> : <Markdown>{message.content ?? ""}</Markdown>}
                      </div>
                    )
                  ) : (
                    <div className="w-full min-w-0 text-left text-xs leading-5 text-slate-900 md:text-sm md:leading-6">{message.content}</div>
                  )}
                </Message>
              );
            })}
            {(typeof resumeAttachProgress === "number" || (!!resumeAttachStatusText && !hasResumeAttached)) ? (
              <Message className="min-w-0 justify-start pl-8 md:pl-10">
                <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                  {resumeAttachStatusText ? (
                    <div className="text-xs text-slate-700">{resumeAttachStatusText}</div>
                  ) : null}
                  {typeof resumeAttachProgress === "number" ? (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span className="truncate">{resumeAttachFileName || "resume.pdf"}</span>
                        <span>{resumeAttachProgress}%</span>
                      </div>
                      <Progress
                        value={resumeAttachProgress}
                        className="h-2 bg-slate-200 [&>[data-slot=progress-indicator]]:bg-slate-900"
                      />
                    </div>
                  ) : null}
                </div>
              </Message>
            ) : null}
            <div ref={messagesEndRef} />
          </ChatContainerContent>
        </ChatContainerRoot>
      )}

      <div className="sticky bottom-0 z-10 shrink-0 bg-white px-2 pt-2 pb-2 md:px-4 md:pt-3 md:pb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm md:rounded-2xl md:p-3">
          <div className="flex items-end">
            <textarea
              ref={chatInputRef}
              placeholder={placeholder}
              value={chatInput}
              rows={1}
              onChange={(e) => {
                onInputChange(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) {
                  e.preventDefault();
                  onSubmit();
                  requestAnimationFrame(() => {
                    if (chatInputRef.current) {
                      chatInputRef.current.style.height = "auto";
                    }
                  });
                }
              }}
              className="flex-1 resize-none border-none bg-transparent px-0 text-sm leading-5 text-gray-900 shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ maxHeight: 120 }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 md:mt-3">
            <div className="flex min-h-7 items-center gap-1.5 md:min-h-8 md:gap-2">
              {/* Resume attach button */}
              <button
                type="button"
                onClick={openResumePicker}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                title={resumeAttachLabel || "Attach resume PDF"}
                aria-label={resumeAttachLabel || "Attach resume PDF"}
              >
                <FiPaperclip className="h-4 w-4" />
              </button>

              {/* CV status badge (jobs context only) */}
              {showCvBadge ? (
                hasResumeAttached ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 md:px-2.5 md:py-1 md:text-xs">
                    <FileCheck2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    <span className="md:hidden">{labels.cvShort || "CV"}</span>
                    <span className="hidden md:inline">{resumeAttachedLabel || "CV"}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={openResumePicker}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-colors md:px-2.5 md:py-1 md:text-xs"
                  >
                    <FileCheck2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    <span>{t("resume.noCv")}</span>
                  </button>
                )
              ) : null}

              {/* Pinned intent badge — always show when intent is known */}
              {pinnedIntent ? (
                <span
                  className={`group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium md:px-2.5 md:py-1 md:text-xs ${
                    pinnedIntent === "jobs"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : pinnedIntent === "services"
                        ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  <span className="md:hidden">
                    {pinnedIntent === "jobs"
                      ? (labels.jobsShort || labels.jobs)
                      : pinnedIntent === "services"
                        ? (labels.servicesShort || labels.services)
                        : (labels.tasksShort || labels.tasks)}
                  </span>
                  <span className="hidden md:inline">
                    {pinnedIntent === "jobs" ? labels.jobs : pinnedIntent === "services" ? labels.services : labels.tasks}
                  </span>
                  {/* Only show clear button outside of session (in-session: use the Select) */}
                  {!inSession ? (
                    <button
                      type="button"
                      onClick={onPinnedIntentClear}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remove selected action"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {/* Intent select — only in session page */}
              {inSession && onIntentChange ? (
                <Select
                  value={pinnedIntent ?? ""}
                  onValueChange={(val) => {
                    if (!val) onIntentChange(null);
                    else onIntentChange(val as TabType);
                  }}
                >
                  <SelectTrigger className="h-7 w-auto min-w-[90px] rounded-lg border border-gray-200 bg-white px-2 text-xs text-slate-700 shadow-none focus:ring-0 md:h-8">
                    <SelectValue placeholder={t("intentSelect.placeholder")} />
                  </SelectTrigger>
                  <SelectContent align="end" className="text-xs">
                    <SelectItem value="jobs">{t("intentSelect.jobs")}</SelectItem>
                    <SelectItem value="services">{t("intentSelect.services")}</SelectItem>
                    <SelectItem value="tasks">{t("intentSelect.tasks")}</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}

              {/* Send button */}
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSearching || isAgentWorking}
                className="flex h-7 w-10 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-60 md:h-8 md:w-12"
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
          </div>
          <input
            ref={resumeInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>
    </div>
  );
}
