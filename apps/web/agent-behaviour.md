# Agent Behavior Plan — Smart Marketplace Search Agent
  
**Scope:** `chat/route.ts` · `results-summary/route.ts` · `hero-search-bar.tsx` · `intentExtractor`  
**Goal:** Fix scope logic, restore natural conversation, enforce intent pinning, keep summary and chat response always present.

---

## 1. Understand What the Agent Must Do

The agent is a **smart marketplace assistant**. It helps users find jobs, services, or tasks through natural conversation. It must:

- Talk naturally like a human assistant (match user language)
- Detect the user's intent from conversation (job / service / task) like it already does
- Pin that intent once detected — never mix result types
- Return results + a natural summary + related prompts every time
- Handle greetings, small talk, and off-topic messages gracefully
- Only switch pinned intent when the user **explicitly** and **unambiguously** asks — otherwise confirm first
- Never hallucinate, never bypass the LLM on short or ambiguous messages

---

## 2. The Three Agent Modes

Every incoming message must resolve to exactly one of these modes before any action is taken:

```
MODE A — CONVERSATION
  Trigger: greeting, small talk, vague question, unclear intent
  Action:  LLM replies naturally, asks what the user needs
  Returns: action: "chat", assistantText: <natural reply>, relatedPrompts: []

MODE B — SEARCH (intent known)
  Trigger: clear search request, intent matches pinned scope or no scope yet
  Action:  LLM confirms understanding, runs search engine, returns cards + summary
  Returns: action: "search", assistantText: <natural intro>, results: [...], relatedPrompts: [...]

MODE C — INTENT SWITCH (ambiguous only)
  Trigger: user seems to want a different category but it's not 100% explicit
  Action:  LLM asks for confirmation before switching
  Returns: action: "chat", assistantText: <confirmation question>, relatedPrompts: [confirm, cancel]
```

**If explicit** (e.g. "actually find me a plumber") → switch immediately, no confirmation needed.  
**If ambiguous** (e.g. "what about cleaning?" while in jobs scope) → ask first.

---

## 3. Rules — Never Break These

### 3.1 `shouldBypassIntentLlm` — The Root Cause of Current Bugs

**Current broken behavior:** this flag fires too eagerly, skips the LLM, produces empty `assistantText`, and misclassifies greetings as search.

**Fixed rule:**

```ts
// RULE: Only bypass the LLM when ALL four conditions are true
const shouldBypassIntentLlm =
  Boolean(scope && scope !== "auto") &&       // scope is pinned
  isLikelySearchRequest(quickQuery) &&        // message is clearly a search
  !isGreetingOrSmallTalk(quickQuery) &&       // not a greeting
  quickQuery.split(" ").filter(Boolean).length > 3; // at least 4 words (not "Hi", "Hello", "Thanks")
```

**Never bypass on:**
- Messages under 4 words
- Greetings (`hi`, `hello`, `salam`, `bonjour`, `مرحبا`, etc.)
- Thank-you messages
- Questions about the agent itself
- Anything `isGreetingOrSmallTalk()` returns `true` for

### 3.2 `assistantText` — Always Present on Search Results

**Current broken behavior:** `search_job` and `search_service` return blocks never set `assistantText`, so users see cards with no agent message.

**Fixed rule:** Every search return block MUST include `assistantText`. Use `aiResult.reply` first (LLM-generated), fall back to locale-aware helper.

```ts
// In search_job return block
const assistantText =
  aiResult.reply?.trim() ||
  buildSearchIntroText(locale, "jobs", searchQuery); // see Section 5

// In search_service return block  
const assistantText =
  aiResult.reply?.trim() ||
  buildSearchIntroText(locale, "services", searchQuery);

// In search_task return block
const assistantText =
  aiResult.reply?.trim() ||
  buildSearchIntroText(locale, "tasks", searchQuery);
```

### 3.3 Intent Pinning — Scope Must Never Leak

**Rule:** Once `pinnedIntent` is set on the frontend, it is passed as `scope` in every request body. The backend must respect it for all search routing. The only way scope changes are:

1. User sends an **explicit** switch signal → backend detects it → switches immediately
2. User sends an **ambiguous** switch signal → backend returns MODE C → user confirms → frontend updates `pinnedIntent`
3. User manually selects from the dropdown → frontend updates `pinnedIntent` directly, no backend confirmation needed

**In `chat/route.ts`:** the scope guard must only fire `intentMismatch` when the query is genuinely ambiguous. If the user says "find me a plumber" while in jobs scope, that is explicit — switch directly, do not ask.

```ts
// Explicit switch detection — add this helper
function isExplicitIntentSwitch(query: string, targetIntent: string): boolean {
  const q = normalizeForIntent(query);
  const serviceKeywords = ["plumber", "electrician", "cleaner", "mechanic", "painter",
    "plombier", "électricien", "نجار", "سباك", "كهربائي", "خدمة", "service"];
  const taskKeywords = ["task", "mission", "gig", "tâche", "مهمة", "مهام"];
  const jobKeywords = ["job", "emploi", "وظيفة", "travail", "عمل", "hire", "recruit"];
  
  if (targetIntent === "services") return serviceKeywords.some(k => q.includes(k));
  if (targetIntent === "tasks") return taskKeywords.some(k => q.includes(k));
  if (targetIntent === "jobs") return jobKeywords.some(k => q.includes(k));
  return false;
}
```

### 3.4 Language — Always Match the User

**Rule:** Never respond in a language different from the user's last message. The `normalizeLocale()` function already exists — use it consistently. Apply it to:
- `assistantText`
- `buildSearchIntroText()`
- `buildScopeMismatchMessage()`
- `relatedPrompts`
- Resume CTAs

**Never:** respond in English when the user wrote in Arabic or French.

### 3.5 Results Summary — Always Fires

**Current broken behavior:** when agent returns `directResults`, the frontend sets `hasSearched: false` and `submittedQuery: ""` which prevents the `useEffect` from firing the summary API.

**Fixed rule in `hero-search-bar.tsx`:** when `directResults` is present, the summary must come from `agent.assistantText` (set correctly per Rule 3.2). Do not rely on the `useEffect` summary path for direct results. Confirm the `content` field is set on the message before the assistant message is injected.

```ts
// In the directResults branch — ensure content is never empty
const finalAssistantText =
  agent.assistantText?.trim() ||
  buildResultsSummary({ type: tab, items: directResults.items, query: q });
```

---

## 4. File-by-File Fix Plan

### 4.1 `chat/route.ts`

**Step 1 — Fix `shouldBypassIntentLlm`**
- Add word count guard (min 4 words)
- Keep `isGreetingOrSmallTalk` check but ensure it covers all languages

**Step 2 — Add `isExplicitIntentSwitch` helper**
- Use it in the scope guard block
- If explicit → route to correct search engine directly, no confirmation

**Step 3 — Add `buildSearchIntroText` helper**
- Returns locale-aware natural intro for search results
- Used as fallback when `aiResult.reply` is empty

**Step 4 — Add `assistantText` to all three search return blocks**
- `search_job` → `assistantText: aiResult.reply?.trim() || buildSearchIntroText(locale, "jobs", searchQuery)`
- `search_service` → same pattern
- `search_task` → same pattern

**Step 5 — Scope guard logic**
- Check `isExplicitIntentSwitch` first
- If explicit: bypass confirmation, route immediately
- If ambiguous: return `intentMismatch` with confirmation prompts
- If same scope: proceed normally

### 4.2 `intentExtractor` (agent)

**Step 1 — Always return a `reply` field**
- The extractor must always populate `reply` with a natural language response
- Even on search intent, `reply` should be a short natural intro like "Sure, let me find you tech jobs in Casablanca..."
- Never return `reply: ""`  on a search type — that is what causes the silent result bug

**Step 2 — Scope awareness in extractor**
- Pass `scope` and `pinnedIntent` into the extractor prompt
- Instruct the LLM: "The user is currently searching in scope: {scope}. Only classify as a different intent if the user explicitly requests it."

**Step 3 — Greeting handling**
- The extractor must classify any greeting or small talk as `type: "conversation"` — no exceptions
- Add explicit few-shot examples in the extractor prompt for `hi`, `hello`, `salam`, `bonjour`, `شكرا`

### 4.3 `results-summary/route.ts`

**Step 1 — Never return empty summary when items exist**
- If the model returns empty output, fall back to `buildResultsSummary()` from the frontend helper
- Add a server-side fallback builder that mirrors the frontend one

**Step 2 — Enforce markdown formatting in the prompt**
- The `buildResultsSummaryPrompt` must instruct the LLM to always use:
  - `## ` H2 title
  - Bold key info with `**`
  - Bullet list for top results
  - Short closing sentence with next-step suggestion

**Step 3 — Language enforcement**
- Pass `userLanguage` detected from the query
- Add to the system prompt: "Respond ONLY in {userLanguage}. Do not mix languages."

### 4.4 `hero-search-bar.tsx`

**Step 1 — Fix the `directResults` summary gap**
- When `directResults` is used, set `content: finalAssistantText` on the message, never leave it empty
- Do not rely on the `useEffect` summary path for direct results

**Step 2 — Protect `pinnedIntent` from accidental reset**
- Only call `setPinnedIntent(null)` when the user explicitly clears via the dropdown or the X button
- Never reset it inside the search flow automatically

**Step 3 — Greeting guard on submit**
- Before calling `handleSearch`, check if the input is a greeting
- If it is, call the agent normally — never short-circuit to a search

**Step 4 — Intent switch from dropdown**
- When user changes scope via dropdown: update `pinnedIntent`, clear `selectedCategory`, do NOT re-run the last search automatically (wait for next user message)

---

## 5. New Helper to Add in `chat/route.ts`

```ts
function buildSearchIntroText(locale: string, intent: AgentIntent, query: string): string {
  const lang = normalizeLocale(locale);
  const q = query.trim();

  if (intent === "jobs") {
    if (lang === "fr") return `Voici les meilleures offres d'emploi pour "${q}" que j'ai trouvées pour toi.`;
    if (lang === "ar") return `إليك أفضل فرص العمل المتعلقة بـ "${q}" التي وجدتها لك.`;
    return `Here are the best job matches I found for "${q}".`;
  }
  if (intent === "services") {
    if (lang === "fr") return `Voici les meilleurs services disponibles pour "${q}".`;
    if (lang === "ar") return `إليك أفضل الخدمات المتاحة لـ "${q}".`;
    return `Here are the top services available for "${q}".`;
  }
  if (lang === "fr") return `Voici les meilleures missions disponibles pour "${q}".`;
  if (lang === "ar") return `إليك أفضل المهام المتاحة لـ "${q}".`;
  return `Here are the best tasks available for "${q}".`;
}
```

---

## 6. Intent Extractor Prompt — Required Instructions

Add these rules to the system prompt inside `intentExtractor`:

```
SCOPE RULES (critical):
- The user's current pinned scope is: {scope}
- If scope is set, classify as that scope's intent UNLESS the user explicitly requests a different type
- Explicit = the user names a different category clearly ("find me a plumber", "I want a service")
- Ambiguous = the user says something loosely related to another type ("what about cleaning?")
- Always populate the `reply` field with a short natural response in the user's language
- Never return reply as empty string on search intents

GREETING RULES (critical):
- Any message that is a greeting, thank-you, or small talk → type: "conversation"
- This includes: hi, hello, hey, thanks, salam, bonjour, bonsoir, مرحبا, اهلا, شكرا — no exceptions
- reply should be warm, natural, and ask what the user needs

LANGUAGE RULES:
- Detect the user's language from their message
- Always reply in that same language
- Never mix languages in the same reply
```

---

## 7. QA Checklist Before Deploying

Test every case below and confirm the expected output:

| Input | Scope | Expected Mode | Expected Output |
|---|---|---|---|
| "Hi" | none | CONVERSATION | Warm greeting, asks what they need |
| "Hi" | jobs pinned | CONVERSATION | Same — never search on greeting |
| "Hello again" | jobs pinned | CONVERSATION | Same |
| "I want a tech job in Casablanca" | none | SEARCH (jobs) | Natural intro + 3 job cards + summary |
| "I want a tech job in Casablanca" | jobs pinned | SEARCH (jobs) | Same |
| "Find me a car wash near Rabat" | none | SEARCH (services) | Natural intro + 3 service cards + summary |
| "Find me a plumber" | jobs pinned | SEARCH (services) — explicit switch | Switch immediately, no confirmation |
| "What about cleaning?" | jobs pinned | MODE C — confirm | "Do you want me to search for services?" |
| "Yes" after MODE C | switching to services | SEARCH (services) | Natural intro + 3 service cards |
| "شكرا" | any | CONVERSATION | Warm reply in Arabic |
| "Merci" | any | CONVERSATION | Warm reply in French |
| "مرحبا بغيت خدمة في الرباط" | none | SEARCH (services) | Natural Arabic intro + results |

---

## 8. Architecture Summary (for any future changes)

```
User message
    │
    ▼
[hero-search-bar.tsx]
    │  passes: { messages, context: { scope, locale, query } }
    ▼
[chat/route.ts]
    │
    ├── shouldBypassIntentLlm? (only if: scope set + clear search + >3 words + not greeting)
    │       YES → skip LLM, route directly to search engine
    │       NO  → call intentExtractor LLM
    │
    ├── aiResult.type === "conversation" → MODE A (natural reply, no search)
    │
    ├── aiResult.type === "search_*" + scope mismatch + NOT explicit → MODE C (confirm)
    │
    ├── aiResult.type === "search_*" + (no mismatch OR explicit switch) → MODE B
    │       → run search engine
    │       → assistantText = aiResult.reply || buildSearchIntroText()
    │       → return cards + assistantText + relatedPrompts
    │
    ▼
[results-summary/route.ts]  ← only called by frontend useEffect for non-direct results
    │  always returns markdown-formatted summary
    ▼
[hero-search-bar.tsx]
    │  injects assistantText as message content
    │  injects results as cards
    │  never leaves content empty
```

---

## 9. What Not to Change

- The existing `classifyTurnIntent` scoring logic — it works, just needs the word count guard
- The `mapJobCards` / `mapServiceCards` helpers — correct as-is
- The `buildSmartRelatedPrompts` helper — correct as-is
- The resume matching pipeline — do not touch
- The session persistence logic — do not touch
- The `trpc` preview queries — do not touch