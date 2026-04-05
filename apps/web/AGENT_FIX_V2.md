# Agent Fix Plan — Post V2 Issues
**Priority:** High — these affect every search interaction  
**Files involved:** `chat/route.ts`, `prompt/intent.ts`, `hero-search-bar.tsx`,  
`agent-chat-container.tsx`, `jobSearchEngine.ts`, `results-summary/route.ts` (delete)

---

## Read These Files First

Before writing any code, read:
1. `app/api/chat/route.ts` — find `checkJobSearchReadiness` and `generatePostResultNarrative`
2. `app/api/chat/agent/prompt/intent.ts` — find `buildPostResultNarrativePrompt`
3. `components/ui/hero-search-bar.tsx` — search for `callResultsSummary`
4. `components/ui/agent-chat-container.tsx` — find the `relatedPrompts` rendering block
5. `app/api/chat/results-summary/route.ts` — this file will be deleted
6. `app/api/chat/agent/jobSearchEngine.ts` — understand what the function returns

---

## Fix 1 — Location Gate Letting Vague Queries Through

### The Problem
User says "dans la tech" — category is satisfied (Tech) but no city, no remote preference,
no locationRequirement. The readiness check should have asked for location.
Instead it searched. One of these is happening:
- `intentData.city` or `intentData.locationRequirement` is not null when it should be
- The LLM is hallucinating a default location from context
- The context accumulator is pulling a location from a previous message incorrectly

### Diagnosis Step
Add this debug log in `chat/route.ts` immediately before `checkJobSearchReadiness`:

```typescript
console.log("[readiness-debug]", {
  category: intentData.category,
  city: intentData.city,
  locationRequirement: intentData.locationRequirement,
  stateAbbreviation: intentData.stateAbbreviation,
  query: intentData.query,
});
```

Run the exact scenario again: say "je cherche un emploi" then "dans la tech".
Check the server logs. You will see which field is incorrectly non-null.

### The Fix
In `prompt/intent.ts` inside `buildIntentExtractorPrompt`, add this rule:

```
LOCATION EXTRACTION RULE (CRITICAL):
- Only set city, locationRequirement, or stateAbbreviation when the user 
  EXPLICITLY mentions a location or work preference in their message.
- "dans la tech" → city: null, locationRequirement: null (no location mentioned)
- "tech à Casablanca" → city: "Casablanca"
- "tech remote" → locationRequirement: "remote"
- "tech en présentiel" → locationRequirement: "in_office"
- NEVER infer or default a location that the user did not state.
- NEVER carry forward location from previous messages — only extract from 
  the current message.
```

Also in `checkJobSearchReadiness` in `orchestrator.ts` or `route.ts`, add a strict
null check. An empty string should be treated as null:

```typescript
const hasLocation = !!(
  (intentData.city?.trim() || null) ??
  (intentData.locationRequirement?.trim() || null) ??
  (intentData.stateAbbreviation?.trim() || null)
);
```

Replace the existing hasLocation check with the above.

---

## Fix 2 — Delete `results-summary/route.ts` and All References

### Step 1 — Delete the file
Delete entirely: `app/api/chat/results-summary/route.ts`

### Step 2 — Remove from `hero-search-bar.tsx`
Find and remove:
- The `callResultsSummary` function definition
- Every call to `callResultsSummary(...)` — there are two: one in the `useEffect`
  and one in the `directResults` branch
- The entire `useEffect` that depends on `topSearchLoading` and calls `callResultsSummary`
- The `ResultsSummaryResponse` type if it is only used by `callResultsSummary`

After removal, `message.content` is set only from `agent.assistantText` which comes
from `generatePostResultNarrative` in `chat/route.ts`. No second source.

### Step 3 — Verify no other file imports from results-summary
Search the codebase for:
```
from "../results-summary"
from "./results-summary"
api/chat/results-summary
callResultsSummary
```
Remove any reference found.

---

## Fix 3 — Post-Result Narrative Format (No Markdown)

### The Problem
The narrative produces H2 headers and bullet points despite instructions saying prose only.
This is because:
1. The LLM defaults to markdown when summarizing structured data
2. The current prompt instruction is not strong enough to override this default

### Fix in `prompt/intent.ts` — `buildPostResultNarrativePrompt`

Replace the entire function with:

```typescript
export function buildPostResultNarrativePrompt(): string {
  return `
You are Serrbi, a smart marketplace assistant talking to a user in a chat.
You just ran a search and found results. Tell the user what you found — like a 
knowledgeable friend would, not like a search engine.

You receive JSON with: searchQuery, intent, hasResume, topResults (max 3 items).
Each result has: position, title, companyName, city, locationRequirement, 
wage, experienceLevel, matchScore, matchedSkills, averageRating, price.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detect the language from searchQuery. Write entirely in that language.
Never mix languages.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT — THIS IS THE MOST IMPORTANT RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write 3-5 sentences of plain flowing prose. That is all.

FORBIDDEN — using any of these will make your response wrong:
✗ Markdown headers: ## Title, ### Subtitle, # Anything
✗ Bullet points: -, •, *, —
✗ Numbered lists: 1. 2. 3.
✗ Bold formatting EXCEPT for one job title or company name only
✗ Starting with "Here are", "Voici", "إليك", "Here is"
✗ More than 5 sentences
✗ Any text that looks like a formatted report or document

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO SAY — IN ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sentence 1-2: Name the strongest result and say WHY it stands out.
  Use a real fact: salary, location match, rating, company name, match score.
  If hasResume is true and matchScore is available, mention the percentage.

Sentence 3: In one sentence only, say what makes the other results different.
  (different city, lower salary, different level — pick the most useful contrast)

Sentence 4-5: End with ONE natural question that helps the user go deeper.
  Examples of good questions:
  - "Tu veux que je filtre uniquement les postes full remote ?"
  - "Do you want me to focus on higher salaries only?"
  - "هل تريد تصفية النتائج حسب الراتب أو المدينة؟"
  - "Tu préfères optimiser le salaire ou la localisation ?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE OF CORRECT OUTPUT (French)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Le meilleur match est le poste **Senior Frontend Developer** chez Intelcia — 
full remote, 15k–18k DH, et le profil correspond bien à ce que tu décris. 
Les deux autres sont solides mais l'un est à Rabat en présentiel et l'autre 
est un niveau intermédiaire. Tu veux que je filtre uniquement les postes 
full remote ?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE OF WRONG OUTPUT — DO NOT DO THIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Voici les résultats trouvés pour votre recherche.

## Emploi Tech à Casablanca et Rabat

- **HPS lance un recrutement** – Ce poste propose un salaire de 20 000 MAD...
- **Tech Lead Agentic** – Bien que le salaire soit plus bas...
- **Tech Lead Front Development** – Proposé par Maroc Telecom...

Tu es plutôt orienté salaire ?"

THIS IS WRONG because it uses a header (##) and bullet points (-).
Never produce output that looks like this.

Return only the message text. No JSON. No preamble. No explanation.
`.trim();
}
```

---

## Fix 4 — DB-Grounded Suggestion Prompts (Game Changer)

### The Concept
Instead of asking the LLM to invent follow-up suggestions, analyze the ranked pool
that `jobSearchEngine` already returned (positions 4 onward) to find real pivot points.
The suggestions are guaranteed to find results because they come from real DB data.

### Step 1 — Modify `jobSearchEngine` to return the full pool

The function currently returns `topResults: ranked.slice(0, 30)`.
Add a separate field for the suggestion pool:

```typescript
// In jobSearchEngine.ts — modify the return type and return statement
export type JobSearchResult = {
  query: string;
  filtersApplied: Record<string, unknown>;
  topResults: RankedJob[];          // top 3 — shown as cards
  suggestionPool: RankedJob[];      // positions 4-10 — used for suggestions
};

// In the return statement:
return {
  query: intentData.query,
  filtersApplied: { ... },
  topResults: ranked.slice(0, 3),
  suggestionPool: ranked.slice(3, 10),  // next 7 results after top 3
};
```

### Step 2 — Create `generateDbGroundedSuggestions` in `orchestrator.ts`

```typescript
type SuggestionPrompt = {
  label: string;   // what the user sees and clicks
  query: string;   // what gets sent as the chat message when clicked
};

export function generateDbGroundedSuggestions(opts: {
  topResults: RankedJob[];       // the 3 cards shown
  suggestionPool: RankedJob[];   // positions 4-10
  intentData: JobIntentData;
}): SuggestionPrompt[] {
  const { topResults, suggestionPool, intentData } = opts;
  const suggestions: SuggestionPrompt[] = [];

  // What the top 3 have in common — we want to suggest PIVOTS from this
  const topCities = new Set(topResults.map(j => j.city?.toLowerCase()).filter(Boolean));
  const topLocReqs = new Set(topResults.map(j => j.locationRequirement?.toLowerCase()).filter(Boolean));
  const topLevels = new Set(topResults.map(j => j.experienceLevel?.toLowerCase()).filter(Boolean));

  // Pivot 1: Different locationRequirement from top 3
  // e.g. top 3 are all in_office → suggest remote if pool has remote jobs
  const remoteJobs = suggestionPool.filter(j => j.locationRequirement === "remote");
  const hybridJobs = suggestionPool.filter(j => j.locationRequirement === "hybrid");
  const allTopRemote = [...topLocReqs].every(r => r === "remote");
  const allTopOnsite = [...topLocReqs].every(r => r === "in_office");

  if (!allTopRemote && remoteJobs.length >= 2) {
    const category = intentData.category ?? topResults[0]?.category ?? "";
    suggestions.push({
      label: buildLocationSuggestionLabel("remote", category),
      query: buildLocationSuggestionQuery("remote", intentData),
    });
  } else if (!allTopOnsite && hybridJobs.length >= 2) {
    const category = intentData.category ?? topResults[0]?.category ?? "";
    suggestions.push({
      label: buildLocationSuggestionLabel("hybrid", category),
      query: buildLocationSuggestionQuery("hybrid", intentData),
    });
  }

  // Pivot 2: Different city from top 3
  // e.g. top 3 are Casablanca → suggest if pool has Rabat or other city jobs
  const citiesInPool = suggestionPool
    .map(j => j.city)
    .filter((c): c is string => !!c && !topCities.has(c.toLowerCase()));
  const uniqueAlternateCities = [...new Set(citiesInPool)].slice(0, 1);
  
  for (const city of uniqueAlternateCities) {
    if (suggestions.length >= 2) break;
    const jobsInCity = suggestionPool.filter(
      j => j.city?.toLowerCase() === city.toLowerCase()
    );
    if (jobsInCity.length >= 1) {
      const category = intentData.category ?? topResults[0]?.category ?? "";
      suggestions.push({
        label: buildCitySuggestionLabel(city, category),
        query: buildCitySuggestionQuery(city, intentData),
      });
    }
  }

  // Pivot 3: Different experience level from top 3
  // e.g. top 3 are senior → suggest junior or mid if pool has them
  const levelsInPool = suggestionPool
    .map(j => j.experienceLevel)
    .filter((l): l is string => !!l && !topLevels.has(l.toLowerCase()));
  const alternateLevel = [...new Set(levelsInPool)][0];
  
  if (alternateLevel && suggestions.length < 3) {
    const category = intentData.category ?? topResults[0]?.category ?? "";
    suggestions.push({
      label: buildLevelSuggestionLabel(alternateLevel, category),
      query: buildLevelSuggestionQuery(alternateLevel, intentData),
    });
  }

  return suggestions.slice(0, 3);
}

// ── Label builders — detect language from intentData.query ──────────────────
// The LLM detects language from the query and builds the label accordingly.
// We keep this LLM-free by having a small inline language detector for labels only.

function detectLang(query: string): "fr" | "ar" | "en" {
  if (/[\u0600-\u06ff]/.test(query)) return "ar";
  const lower = query.toLowerCase();
  if (["je", "un", "une", "des", "dans", "pour", "avec", "cherche"].some(w => lower.includes(w))) return "fr";
  return "en";
}

function buildLocationSuggestionLabel(locReq: string, category: string): string {
  // Returns a natural label like "Remote tech jobs" / "Postes tech en remote"
  // Implementation: build based on detected language from the stored query
  // This is called at runtime with actual data so we can't detect language here
  // — pass the label generation to the LLM in a single cheap batch call instead
  // See Step 3 below for how labels are localized
  return `${locReq}:${category}`; // placeholder — replaced in Step 3
}

function buildCitySuggestionLabel(city: string, category: string): string {
  return `city:${city}:${category}`; // placeholder — replaced in Step 3
}

function buildLevelSuggestionLabel(level: string, category: string): string {
  return `level:${level}:${category}`; // placeholder — replaced in Step 3
}

function buildLocationSuggestionQuery(locReq: string, intentData: JobIntentData): string {
  const base = intentData.query?.trim() ?? "";
  return `${base} ${locReq}`.trim();
}

function buildCitySuggestionQuery(city: string, intentData: JobIntentData): string {
  const base = intentData.query?.trim() ?? "";
  return `${base} ${city}`.trim();
}

function buildLevelSuggestionQuery(level: string, intentData: JobIntentData): string {
  const base = intentData.query?.trim() ?? "";
  return `${base} ${level}`.trim();
}
```

### Step 3 — Localize suggestion labels with one small LLM call

Because suggestion labels need to be in the user's language and we want to avoid
hardcoded locale strings, make one lightweight LLM call to localize them:

```typescript
// In route.ts — after generating DB-grounded suggestions
async function localizeSuggestionLabels(opts: {
  rawSuggestions: Array<{ label: string; query: string }>;
  userQuery: string;
  intent: string;
}): Promise<string[]> {
  if (opts.rawSuggestions.length === 0) return [];

  const systemPrompt = `
You convert structured suggestion data into short natural-language labels.
Detect the language from the "userQuery" field and write ALL labels in that language.
Each label must be under 8 words — a short phrase a user would naturally say.

Input format: JSON array of { label: "type:value:category", query: string }
label types:
  "remote:Tech" → "Remote tech positions" / "Postes tech en remote" / "وظائف تقنية عن بعد"
  "hybrid:Finance" → "Hybrid finance roles" / "Postes finance hybrides"
  "city:Rabat:Tech" → "Tech jobs in Rabat" / "Emplois tech à Rabat" / "وظائف تقنية في الرباط"
  "level:junior:Tech" → "Junior tech roles" / "Postes tech junior" / "وظائف تقنية جونيور"
  "level:senior:Tech" → "Senior tech roles" / "Postes tech senior"

Output: JSON array of strings (labels only, same order as input). Nothing else.
`.trim();

  try {
    const raw = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ userQuery: opts.userQuery, suggestions: opts.rawSuggestions }) },
      ],
      { temperature: 0.3, maxTokens: 100 },
    );
    const first = raw.indexOf("[");
    const last = raw.lastIndexOf("]");
    if (first === -1 || last === -1) throw new Error("No array");
    const parsed = JSON.parse(raw.slice(first, last + 1));
    if (Array.isArray(parsed) && parsed.every(s => typeof s === "string")) {
      return parsed.slice(0, 3);
    }
    throw new Error("Invalid format");
  } catch {
    // Fallback: use raw query as the label (always works, not pretty)
    return opts.rawSuggestions.map(s => s.query);
  }
}
```

### Step 4 — Wire it in `chat/route.ts`

In the `search_job` block, replace the call to `generateSmartSuggestions` with:

```typescript
// BEFORE (LLM hallucinated suggestions)
const relatedPrompts = await generateSmartSuggestions({ intent: "jobs", query: searchQuery, extractedData: intentData, items: cards });

// AFTER (DB-grounded suggestions from real pool)
const rawSuggestions = generateDbGroundedSuggestions({
  topResults: cards,
  suggestionPool: searchResult.suggestionPool,  // new field from jobSearchEngine
  intentData,
});

const localizedLabels = await localizeSuggestionLabels({
  rawSuggestions,
  userQuery: searchQuery,
  intent: "jobs",
});

// Merge labels with queries into the relatedPrompts format
// relatedPrompts are strings — the label IS the prompt that gets sent when clicked
// So we use the localized label as what the user sees AND what gets sent to the agent
// The agent then processes it as a search query — which works because the labels
// are written as natural search phrases ("Remote tech positions", "Emplois tech à Rabat")
const relatedPrompts = localizedLabels.length > 0
  ? localizedLabels
  : rawSuggestions.map(s => s.query); // fallback to raw query
```

### Step 5 — Verify the click flow still works

When user clicks a suggestion like "Postes tech en remote", it calls `onSuggestionSelect`
which calls `handleSearch("Postes tech en remote")`. The agent receives this as a new
user message, `intentExtractor` runs, extracts `{ category: Tech, locationRequirement: remote }`,
`checkJobSearchReadiness` passes (both fields present), `jobSearchEngine` runs.

Because the suggestion was generated from a real pool that had remote jobs, the search
will find results. The loop is closed.

---

## Fix 5 — `agent-chat-container.tsx` — Keep Suggestions as Text Links

The suggestions rendering block is already correct (↗ text links not pills).
and also instead of using coded icon ↗ use lucide icon library for better icon
No change needed here — this fix only changes WHERE the data comes from (DB-grounded
instead of LLM-hallucinated). The rendering stays the same.

The only change is that `relatedPrompts` strings now look like:
```
"Postes tech en remote"        ← previously: "Remote positions only" (generic)
"Emplois tech à Rabat"         ← previously: "More job opportunities" (useless)
"Postes tech niveau senior"    ← previously: "Filter by experience level" (vague)
```

Because these are derived from real jobs in the pool, clicking them finds results.

---


## Verification — Run These Scenarios After Applying All Fixes

### Scenario 1 — Location gate
```
User: "je cherche un emploi"
Expected: asks for domain + location

User: "dans la tech"
Expected: asks for location (city or remote) — NOT searching yet
Check server log: city=null, locationRequirement=null

User: "remote"
Expected: search fires, cards shown, narrative in prose (no H2, no bullets)
```

### Scenario 2 — Narrative format check
After search fires, the message content must:
- Start directly with an opinion sentence mentioning the top result by name
- Contain NO ## headers
- Contain NO bullet points (-, •, *)
- End with one question
- Be 3-5 sentences total

### Scenario 3 — DB-grounded suggestions
After cards load, check the suggestion prompts:
- They should reference real alternatives from the pool (different city, remote, different level)
- Clicking one should always produce results (never 0 cards)
- The labels should be in the same language as the user's original query

### Scenario 4 — results-summary completely gone
In browser network tab, after a search:
- NO request to `/api/chat/results-summary` should appear
- `message.content` should be set once and never updated again after cards load

## Fix 6 — CARD_CLICKED Event Tracking (Currently Not Implemented)
 
### Why it is not in the database yet
The plan described this feature but it was never implemented in the frontend.
The `trackCardClick` function and the `onClick` wrapper on each card do not exist
in `agent-chat-container.tsx`. Nothing fires when a card is clicked. Fix this now.
 
### Does CARD_CLICKED feed into ranking scores?
**Phase 1 (this fix): No — store only.**
The event is stored for analytical use. You will see which card position
gets clicked most. If position 3 is often clicked over position 1, your
ranking weights are off and need tuning.
 
**Phase 2 (future, not in this plan): Yes — use in ranking.**
Once enough click data exists, add a `popularityScore` signal to `rankingEngine.ts`:
```
finalScore = 0.50 × semantic + 0.22 × overlap + 0.10 × recency
           + 0.10 × location + 0.08 × popularityScore
```
`popularityScore` = count of CARD_CLICKED events for that jobId, normalized.
Do not implement Phase 2 yet — you need data first.
 
---
 
### Step 1 — Add CARD_CLICKED to your Prisma EventName enum
 
Open `prisma/schema.prisma`. Find the `EventName` enum and add `CARD_CLICKED`:
 
```prisma
enum EventName {
  AGENT_INTENT_TRIGGERED
  AGENT_SEARCH_RESULTS_RETURNED
  CARD_CLICKED                    // ← ADD THIS LINE
}
```
 
After saving, run:
```bash
npx prisma migrate dev --name add_card_clicked_event
npx prisma generate
```
 
---
 
### Step 2 — Move `trackAgentEvent` to `lib/agent/tracker.ts`
 
Currently `trackAgentEvent` lives inside `app/api/chat/route.ts`.
It needs to move to a shared location so both `chat/route.ts` (server-side events)
and a new `api/events/route.ts` (client-side events) can use the same function.
 
Create `lib/agent/tracker.ts`:
 
```typescript
import { prisma } from "@workspace/db";
 
type TrackEventArgs = {
  userId: string;
  sessionId: string;
  name: "AGENT_INTENT_TRIGGERED" | "AGENT_SEARCH_RESULTS_RETURNED" | "CARD_CLICKED";
  intent?: "conversation" | "search_job" | "search_service" | "search_task" | null;
  data?: Record<string, unknown>;
};
 
export async function trackAgentEvent(args: TrackEventArgs): Promise<void> {
  if (!args.userId) return;
  try {
    await (prisma as any).event.create({
      data: {
        userId: args.userId,
        sessionId: args.sessionId,
        name: args.name,
        intent: args.intent ?? null,
        source: "agent_chat",
        data: args.data ?? {},
      },
    });
  } catch (error) {
    console.error("Failed to track agent event", error);
  }
}
```
 
In `app/api/chat/route.ts`:
- Delete the local `trackAgentEvent` function definition
- Add at the top: `import { trackAgentEvent } from "@/lib/agent/tracker";`
- All existing calls to `trackAgentEvent(...)` remain unchanged
 
---
 
### Step 3 — Create `app/api/events/route.ts`
 
This is the HTTP endpoint the frontend calls when a card is clicked.
It is authenticated — anonymous clicks are not stored.
 
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { trackAgentEvent } from "@/lib/agent/tracker";
 
export const runtime = "nodejs";
 
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // Silently ignore — do not return 401, just skip tracking
      return NextResponse.json({ ok: true });
    }
 
    const body = await req.json();
    const { sessionId, cardId, cardPosition, cardType, searchQuery, matchScore } = body;
 
    if (!sessionId || !cardId) {
      return NextResponse.json({ ok: true }); // missing fields — skip silently
    }
 
    await trackAgentEvent({
      userId: session.user.id,
      sessionId,
      name: "CARD_CLICKED",
      intent:
        cardType === "job" ? "search_job"
        : cardType === "service" ? "search_service"
        : cardType === "task" ? "search_task"
        : null,
      data: {
        cardId,
        cardPosition,       // 0-indexed: 0 = first card, 1 = second, 2 = third
        cardType,           // "job" | "service" | "task"
        searchQuery,        // what was searched when this card appeared
        matchScore,         // the score shown on the card (null if no resume)
      },
    });
 
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Never surface errors to the frontend — tracking must never break UX
    console.error("[events/route] Error:", err?.message);
    return NextResponse.json({ ok: true });
  }
}
```
 
---
 
### Step 4 — Add click handler in `agent-chat-container.tsx`
 
#### 4a — Add `agentSessionId` to the component props
 
The component needs to know the current session ID to include in the event.
Add it to `AgentChatContainerProps`:
 
```typescript
type AgentChatContainerProps = {
  // ... existing props
  agentSessionId: string;   // ← ADD THIS
};
```
 
Pass it from `hero-search-bar.tsx`:
```typescript
// In hero-search-bar.tsx, inside the AgentChatContainer JSX:
<AgentChatContainer
  // ... existing props
  agentSessionId={getOrCreateAgentSessionId()}
/>
```
 
#### 4b — Add `trackCardClick` function inside `AgentChatContainer`
 
Add this function inside the component, before the return statement:
 
```typescript
function trackCardClick(opts: {
  cardId: string;
  cardPosition: number;
  cardType: "job" | "service" | "task";
  searchQuery: string;
  matchScore: number | null;
}) {
  // Fire and forget — never block the user's navigation
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: agentSessionId,
      cardId: opts.cardId,
      cardPosition: opts.cardPosition,
      cardType: opts.cardType,
      searchQuery: opts.searchQuery,
      matchScore: opts.matchScore,
    }),
  }).catch(() => {}); // swallow all errors — tracking must never throw
}
```
 
#### 4c — Wrap each card in the results map with onClick
 
Find the cards rendering block inside `message.results ? (...)`.
Add `onClick` and `index` to each card wrapper:
 
```tsx
{message.results.items.map((item: any, index: number) => {
  const cardType =
    message.results?.type === "jobs" ? "job"
    : message.results?.type === "services" ? "service"
    : "task";
 
  const cardWrap = "w-[72vw] min-w-[72vw] shrink-0 snap-start md:w-auto md:min-w-0 md:shrink cursor-pointer";
 
  const handleCardClick = () => {
    trackCardClick({
      cardId: item.id,
      cardPosition: index,
      cardType,
      searchQuery: message.results?.query ?? "",
      matchScore: item.matchScore ?? null,
    });
  };
 
  if (message.results?.type === "jobs") {
    return (
      <div key={item.id} className={cardWrap} onClick={handleCardClick}>
        <JobCard className="h-full" job={item} compact />
      </div>
    );
  }
  if (message.results?.type === "services") {
    return (
      <div key={item.id} className={cardWrap} onClick={handleCardClick}>
        <ServiceCard service={item} className="h-full" />
      </div>
    );
  }
  return (
    <div key={item.id} className={cardWrap} onClick={handleCardClick}>
      <TaskCard task={item} className="h-full" />
    </div>
  );
})}
```
 
---
 
### Step 5 — Verify in database
 
After implementing, run this test:
1. Start a chat session, search for a job, see cards
2. Click any card
3. In your database client (Prisma Studio or direct SQL), run:
   ```sql
   SELECT * FROM "Event" WHERE name = 'CARD_CLICKED' ORDER BY "createdAt" DESC LIMIT 5;
   ```
4. You should see a row with:
   - `name: CARD_CLICKED`
   - `data.cardPosition`: 0, 1, or 2
   - `data.searchQuery`: the query that produced the cards
   - `data.matchScore`: the score if resume was uploaded
 
### What to check in the data over time
Once you have 50+ click events, run:
```sql
SELECT 
  data->>'cardPosition' as position,
  COUNT(*) as clicks
FROM "Event" 
WHERE name = 'CARD_CLICKED'
GROUP BY data->>'cardPosition'
ORDER BY clicks DESC;
```
If position 2 (third card) has more clicks than position 0 (first card),
your ranking needs tuning. That's your feedback loop.