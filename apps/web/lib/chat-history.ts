const STORAGE_KEY = "serrbi:chat-history";
const SESSION_KEY = "serrbi:chat-session";
const MAX_SESSIONS = 50;

export type ChatHistoryEntry = {
  id: string;
  title: string;
  firstQuery: string;
  messages: SerializedMessage[];
  createdAt: number;
  updatedAt: number;
};

export type SerializedMessage = {
  id: number;
  role: "user" | "assistant";
  content?: string;
  kind?: "text" | "results" | "suggestions";
  results?: {
    key: string;
    query: string;
    type: "jobs" | "services" | "tasks";
    items: any[];
    isLoading: boolean;
  };
  relatedPrompts?: string[];
};

function generateId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readHistory(): ChatHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatHistoryEntry[];
  } catch {
    return [];
  }
}

function writeHistory(entries: ChatHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_SESSIONS)));
  } catch { /* quota exceeded — silently ignore */ }
}

export function getAllChatHistory(): ChatHistoryEntry[] {
  return readHistory().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getChatById(id: string): ChatHistoryEntry | undefined {
  return readHistory().find((e) => e.id === id);
}

export function deleteChatById(id: string) {
  writeHistory(readHistory().filter((e) => e.id !== id));
}

export function renameChatById(id: string, newTitle: string) {
  const history = readHistory();
  const entry = history.find((e) => e.id === id);
  if (entry) {
    entry.title = newTitle;
    entry.updatedAt = Date.now();
    writeHistory(history);
  }
}

export function clearAllChatHistory() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function saveCurrentSession(messages: SerializedMessage[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
  } catch {}
}

export function restoreCurrentSession(): SerializedMessage[] | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SerializedMessage[];
  } catch {
    return null;
  }
}

export function clearCurrentSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

export function persistChatToHistory(messages: SerializedMessage[]) {
  const userMessages = messages.filter((m) => m.role === "user" && m.content?.trim());
  if (userMessages.length === 0) return;

  const firstQuery = userMessages[0]!.content!.trim();
  const title = firstQuery.length > 60 ? firstQuery.slice(0, 57) + "..." : firstQuery;

  const history = readHistory();
  const activeId = getActiveSessionId();

  const existing = activeId ? history.find((e) => e.id === activeId) : null;

  const serialized: SerializedMessage[] = messages
    .filter((m) => m.content?.trim() || m.results)
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      kind: m.kind,
      results: m.results ? { ...m.results, isLoading: false } : undefined,
      relatedPrompts: m.relatedPrompts,
    }));

  if (existing) {
    existing.messages = serialized;
    existing.updatedAt = Date.now();
    existing.title = title;
    writeHistory(history);
  } else {
    const entry: ChatHistoryEntry = {
      id: activeId || generateId(),
      title,
      firstQuery,
      messages: serialized,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    writeHistory([entry, ...history]);
    setActiveSessionId(entry.id);
  }
}

function getActiveSessionId(): string | null {
  try { return sessionStorage.getItem("serrbi:active-chat-id"); } catch { return null; }
}

function setActiveSessionId(id: string) {
  try { sessionStorage.setItem("serrbi:active-chat-id", id); } catch {}
}

export function startNewChatSession() {
  try {
    sessionStorage.removeItem("serrbi:active-chat-id");
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("serrbi:agent-session-id");
  } catch {}
}

export function loadChatSession(id: string): SerializedMessage[] | null {
  const entry = getChatById(id);
  if (!entry) return null;
  try { sessionStorage.setItem("serrbi:active-chat-id", id); } catch {}
  return entry.messages;
}
