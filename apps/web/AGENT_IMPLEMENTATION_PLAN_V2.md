# Agent Implementation Plan
**App:** Serrbi Marketplace  
**Scope:** Full agent rewrite — orchestration, scoring, tracking, conversation, architecture  
**Goal:** A natural, smart, opinionated agent that feels like talking to a senior recruiter

---

## 0. Understand the Architecture First

Before writing any code, read and understand these files in order:

1. `app/api/chat/route.ts` — main HTTP handler, orchestration entry point
2. `app/api/chat/agent/intentExtractor.ts` — LLM intent extraction
3. `app/api/chat/agent/prompt/intent.ts` — LLM system prompts
4. `app/api/chat/agent/jobSearchEngine.ts` — DB query + filter builder
5. `app/api/chat/agent/serviceSearchEngine.ts` — same for services
6. `app/api/chat/agent/rankingEngine.ts` — scoring formulas
7. `app/api/chat/agent/scoreEngine.ts` — resume match blending
8. `components/ui/hero-search-bar.tsx` — frontend state, message injection
9. `components/ui/agent-chat-container.tsx` — rendering, card display
10. `prisma/schema.prisma` — Event model, all enums

Do NOT write code until you have read all ten files above.

---

## 1. New File Structure

Create these files. Do not put logic in `route.ts` beyond HTTP handling.

```
app/api/chat/
  route.ts                    ← thin HTTP handler only, imports from agent/
  agent/
    keywords.ts               ← NEW: all multilingual keyword arrays
    classifier.ts             ← NEW: heuristic classifiers using keywords
    orchestrator.ts           ← NEW: readiness, bypass, scope guard decisions
    contextAccumulator.ts     ← NEW: merges context across conversation turns
    intentExtractor.ts        ← KEEP: LLM call + JSON parsing
    jobSearchEngine.ts        ← MODIFY: remove 120 cap, fix fallback order
    serviceSearchEngine.ts    ← MODIFY: remove 90 cap
    scoreEngine.ts            ← MODIFY: improve weights, add field bonuses
    rankingEngine.ts          ← MODIFY: improve weights, add title boost
    prompt/
      intent.ts               ← MODIFY: add post-result narrative instruction
      suggestions.ts          ← DELETE: no longer needed
      results.ts              ← DELETE: no longer needed (merged into intent)
```

---

## 2. `agent/keywords.ts` — All Multilingual Keywords

This file contains ONLY data — no logic, no functions. Every keyword array used for heuristic classification lives here. Organized by purpose.

```typescript
// Greeting signals — any message matching these is conversation, never search
export const GREETING_PHRASES = [
  // English
  "hi", "hey", "hello", "yo", "good morning", "good afternoon", "good evening",
  "how are you", "who are you", "what can you do", "thanks", "thank you",
  // French
  "salut", "bonjour", "bonsoir", "coucou", "ca va", "qui es tu",
  "tu fais quoi", "merci",
  // Arabic / Darija
  "مرحبا", "اهلا", "أهلا", "سلام", "السلام عليكم", "كيف حالك",
  "شكرا", "شكرًا", "واش لاباس", "لاباس",
] as const;

// Search action signals
export const SEARCH_ACTION_PHRASES = [
  // English
  "find", "search", "looking for", "look for", "show me",
  "i need", "i want", "hire", "apply",
  // French
  "cherche", "recherche", "trouve", "montre moi", "jai besoin", "je veux",
  // Arabic / Darija
  "بغيت", "كنقلب", "ابحث", "أبحث", "اريد", "أريد",
  "احتاج", "أحتاج", "وريني",
] as const;

// Marketplace nouns — strong search signal
export const MARKETPLACE_NOUNS = [
  "job", "jobs", "work", "service", "services", "task", "tasks", "freelance",
  "emploi", "emplois", "travail", "mission", "tache", "taches",
  "وظيفة", "وظائف", "خدمة", "خدمات", "مهمة", "مهام", "عمل",
] as const;

// Location / constraint signals
export const CONSTRAINT_SIGNALS = [
  "remote", "onsite", "hybrid", "à distance", "en ligne", "présentiel",
  "casablanca", "rabat", "marrakech", "tangier", "agadir", "fes", "meknes",
  "tanger", "kenitra", "salé", "الدار البيضاء", "الرباط", "مراكش", "أكادير",
  "budget", "salary", "wage", "prix", "salaire", "price", "راتب",
  "عن بعد", "حضوري",
] as const;

// Job category keyword map — maps to your JobCategory enum values
export const JOB_CATEGORY_KEYWORDS: Record<string, string[]> = {
  Tech: [
    "developer", "developpeur", "dev", "software", "frontend", "backend",
    "fullstack", "full stack", "data", "engineer", "ingénieur", "it",
    "tech", "programmer", "programmeur", "informatique", "devops",
    "mobile", "android", "ios", "react", "node", "python", "java",
    "مطور", "برمجة", "تقنية", "مهندس", "حاسوب",
  ],
  Finance: [
    "finance", "accountant", "accounting", "comptable", "audit", "auditor",
    "bank", "banque", "contrôleur", "trésorier", "analyste financier",
    "محاسب", "مالية", "بنك", "محاسبة",
  ],
  Health: [
    "doctor", "médecin", "nurse", "infirmier", "infirmière", "medical",
    "médical", "sante", "santé", "health", "pharmac", "pharmacie",
    "clinique", "hôpital", "urgences",
    "طبيب", "ممرض", "صحة", "دكتور", "صيدلية",
  ],
  Legal: [
    "lawyer", "avocat", "legal", "juridique", "notaire", "juriste",
    "droit", "law", "محامي", "قانون", "قضاء",
  ],
  Education: [
    "teacher", "professeur", "prof", "enseignant", "education", "éducation",
    "formateur", "instructor", "tuteur", "pédagogue",
    "معلم", "أستاذ", "تعليم", "مدرس",
  ],
  Construction: [
    "construction", "builder", "bâtiment", "mason", "maçon", "plumbing",
    "plomberie", "electric", "électricité", "chantier", "génie civil",
    "بناء", "مقاول", "بنّاء",
  ],
  Hospitality: [
    "hotel", "hôtel", "restaurant", "hospitality", "hôtellerie",
    "serveur", "serveuse", "waiter", "cuisine", "cuisinier", "chef",
    "réception", "réceptionniste", "accueil", "tourisme",
    "فندق", "استقبال", "مطعم", "نادل", "طباخ", "سياحة",
  ],
  CallCenter: [
    "call center", "centre d'appel", "customer support", "service client",
    "téléconseiller", "téléopérateur", "hotline",
    "دعم عملاء", "مركز اتصال", "خدمة عملاء",
  ],
  Auto: [
    "mechanic", "mécanicien", "garage", "automotive", "automobile",
    "auto", "car repair", "carrossier",
    "ميكانيكي", "كراج", "سيارات",
  ],
  Cleaning: [
    "cleaning", "cleaner", "nettoyage", "ménage", "entretien",
    "agent d'entretien",
    "نظافة", "تنظيف",
  ],
};

// Service category keyword map — maps to your ServiceCategory enum values
export const SERVICE_CATEGORY_KEYWORDS: Record<string, string[]> = {
  HomeMaintenance: [
    "plumber", "plombier", "سباك",
    "electrician", "électricien", "كهربائي",
    "painter", "peintre", "دهان",
    "carpenter", "menuisier", "نجار",
    "locksmith", "serrurier",
    "cleaning", "nettoyage", "نظافة", "تنظيف",
    "maintenance", "entretien", "صيانة",
    "repair", "réparation",
  ],
  ConstructionInstallation: [
    "construction", "بناء", "architect", "architecture", "هندسة",
    "renovation", "ترميم", "maçonnerie",
  ],
  HealthWellness: [
    "doctor", "médecin", "طبيب", "nurse", "infirmier", "ممرض",
    "therapist", "thérapeute", "معالج",
    "nutrition", "تغذية", "fitness", "لياقة",
    "clinic", "clinique", "عيادة",
  ],
  BeautyPersonalCare: [
    "beauty", "beauté", "جمال", "تجميل",
    "hairstylist", "coiffeur", "حلاق",
    "makeup", "maquillage", "مكياج",
    "spa", "سبا", "barber", "barbier",
  ],
  EventsMedia: [
    "event", "événement", "فعالية",
    "wedding", "mariage", "زفاف", "عرس",
    "photographer", "photographe", "مصور",
    "dj", "music", "musique",
  ],
  FoodCatering: [
    "catering", "traiteur", "تموين",
    "chef", "طباخ", "cuisinier",
    "bakery", "boulangerie", "مخبزة",
  ],
  DigitalCreative: [
    "design", "تصميم", "graphic", "graphique",
    "developer", "développeur", "مطور",
    "marketing", "تسويق", "seo", "web",
    "social media", "réseaux sociaux", "content",
  ],
  LegalFinance: [
    "lawyer", "avocat", "محامي",
    "accountant", "comptable", "محاسب",
    "tax", "fiscalité", "ضرائب",
  ],
  EducationCoaching: [
    "teacher", "professeur", "أستاذ", "معلم",
    "tutor", "tuteur", "مدرس",
    "coach", "coaching", "تدريب",
  ],
  AutomotiveTransport: [
    "mechanic", "mécanicien", "ميكانيكي",
    "garage", "كراج",
    "driver", "chauffeur", "سائق",
    "transport", "نقل",
  ],
};

// Explicit intent switch keywords — used to detect clear scope change
export const EXPLICIT_SERVICE_KEYWORDS = [
  "plumber", "electrician", "cleaner", "mechanic", "painter", "carpenter",
  "plombier", "électricien", "nettoyage", "mécanicien", "peintre",
  "سباك", "كهربائي", "نجار", "ميكانيكي", "دهان",
  "service", "services", "خدمة", "خدمات",
] as const;

export const EXPLICIT_TASK_KEYWORDS = [
  "task", "tasks", "mission", "gig", "freelance",
  "tâche", "tâches", "مهمة", "مهام",
] as const;

export const EXPLICIT_JOB_KEYWORDS = [
  "job", "jobs", "work", "hire", "recruit", "employ",
  "emploi", "emplois", "travail", "poste",
  "وظيفة", "وظائف", "عمل",
] as const;
```

---

## 3. `agent/classifier.ts` — All Heuristic Functions

Pure functions only. No LLM calls. No side effects. Import from `keywords.ts`.

### Functions to implement:

**`classifyTurnIntent(text: string): "chat" | "search"`**
- Normalize text: remove diacritics, lowercase, remove punctuation
- Score greetings → chat, search phrases + marketplace nouns → search
- Short messages (<= 3 words) with no marketplace noun default to chat
- Questions about the agent itself (who are you, qui es tu, شنو تقدر) → chat +3 bonus
- Return "search" only when searchScore >= chatScore + 1

**`inferJobCategoryFromText(query: string, skills?: string[]): string | null`**
- Combine query + skills into one normalized string
- Iterate JOB_CATEGORY_KEYWORDS from keywords.ts
- Return first matching category key or null

**`inferServiceCategoryFromText(query: string): string | null`**
- Same pattern using SERVICE_CATEGORY_KEYWORDS

**`isExplicitIntentSwitch(query: string, targetType: string): boolean`**
- Normalize query
- Check EXPLICIT_SERVICE_KEYWORDS, EXPLICIT_TASK_KEYWORDS, EXPLICIT_JOB_KEYWORDS
- Return true only when target keywords are clearly present

**`isGreetingOrSmallTalk(text: string): boolean`**
- Returns classifyTurnIntent(text) === "chat"

**`isLikelySearchRequest(text: string): boolean`**
- Returns classifyTurnIntent(text) === "search"

---

## 4. `agent/orchestrator.ts` — All Decision Logic

No LLM calls. No DB queries. Pure decisions based on extracted data.

### 4.1 Search Readiness

```typescript
type ReadinessResult =
  | { ready: true }
  | { ready: false; missingField: "category" | "location" | "both" };

function checkJobSearchReadiness(intentData: JobIntentData): ReadinessResult
```

Rules:
- `hasCategory` = intentData.category is set OR inferJobCategoryFromText returns non-null
- `hasLocation` = intentData.city OR intentData.locationRequirement OR intentData.stateAbbreviation
- Both missing → `{ ready: false, missingField: "both" }`
- Only category missing → `{ ready: false, missingField: "category" }`
- Only location missing → `{ ready: false, missingField: "location" }`
- Both present → `{ ready: true }`

### 4.2 Bypass Decision

```typescript
function shouldBypassIntentLlm(opts: {
  scope: string | undefined;
  query: string;
}): boolean
```

Rules — ALL must be true to bypass:
1. `scope` is set and not "auto"
2. `isLikelySearchRequest(query)` is true
3. `!isGreetingOrSmallTalk(query)` is true
4. `query.split(" ").filter(Boolean).length > 3`

### 4.3 Scope Guard

```typescript
function checkScopeGuard(opts: {
  pinnedScope: string;
  extractedType: string;
  query: string;
}): { mismatch: false } | { mismatch: true; suggestedIntent: string; isExplicit: boolean }
```

Rules:
- If extractedType matches pinnedScope → no mismatch
- If explicit switch detected → `{ mismatch: true, isExplicit: true }` — switch immediately
- If ambiguous → `{ mismatch: true, isExplicit: false }` — ask confirmation

---

## 5. `agent/contextAccumulator.ts` — Cross-Turn Context

The agent should remember what the user said across turns and merge it.

```typescript
type AccumulatedContext = {
  category?: string;
  city?: string;
  locationRequirement?: string;
  experienceLevel?: string;
  skills?: string[];
  minWage?: number;
  maxWage?: number;
};

function mergeIntentContext(
  previous: AccumulatedContext,
  current: Partial<JobIntentData>,
): AccumulatedContext
```

Rules:
- New values override old ones (user can refine)
- null from current does NOT erase non-null from previous
- skills array merges (union), not replaces
- This context is passed to the prompt and used to enrich intentData before search

**How to use it:**
- In `route.ts`, extract `AccumulatedContext` from the last few assistant messages that contained search results
- Pass it to `extractIntent` as `previousContext`
- In `prompt/intent.ts`, include previous context in the system prompt so the LLM knows what was already established

---

## 6. `agent/prompt/intent.ts` — Unified Prompt

### 6.1 Remove all hardcoded locale strings

The prompt file must contain NO `lang === "fr"` checks. The LLM detects language from the user message.

### 6.2 Add post-result narrative instruction

The intent extractor now has an additional job when `type` is a search result: write the post-result narrative as part of `reply`. This eliminates the need for `results-summary/route.ts` entirely.

Add this section to the prompt:

```
POST-RESULT NARRATIVE (when type is search_job, search_service, search_task):
You will sometimes receive the top 3 search results in the user message context 
under the key "searchResults". When present:
- Write "reply" as a natural, opinionated 2-4 sentence response AFTER seeing the results
- Pick the strongest result and say clearly why it stands out (salary, location, rating, match)
- Briefly mention what makes the others different (one sentence)
- End with one natural follow-up question — a refinement or alternative angle
- Sound like a knowledgeable friend, not a search engine
- Use only facts from the provided results — never invent data
- Do NOT use bullet points, headers, or lists — prose only
- Keep it under 5 sentences total
```

### 6.3 Delete `suggestions.ts` and `results.ts`

These are no longer needed. The post-result narrative replaces both.
The agent's follow-up suggestions are embedded naturally in the reply prose.

---

## 7. `agent/jobSearchEngine.ts` — Remove Cap, Fix Fallback Order

### 7.1 Remove the 120 job limit

```typescript
// BEFORE
let pool = await db.job.findMany({ where: strictWhere, take: 120, ... });

// AFTER
// No take limit on the filtered query.
// The filters (category, locationRequirement, city) already constrain the pool.
// Add a safety cap only as a last-resort DB protection:
const SAFETY_CAP = 1000; // only applies if somehow all filters are dropped
let pool = await db.job.findMany({ where: strictWhere, orderBy: [...], });
// If pool > SAFETY_CAP, slice before ranking (not before filtering)
const rankingPool = pool.length > SAFETY_CAP ? pool.slice(0, SAFETY_CAP) : pool;
```

### 7.2 Fix fallback relaxation order

When strict filters return 0 results, relax one filter at a time in this order:

```
1. experienceLevel    ← least important, user can adjust
2. type               ← full_time vs part_time, user is flexible
3. wage range         ← salary is negotiable
4. stateAbbreviation  ← state is less specific than city
5. city               ← location preference, important but not blocking
6. locationRequirement ← remote/hybrid/onsite — give up last
7. category           ← NEVER drop category first, it's the core domain signal
```

The current implementation drops `city` before `price` and `rating`. Fix the order.

### 7.3 Handle remote as a special case

When `locationRequirement === "remote"`, do NOT filter by city. Remote jobs are location-independent. Current code applies both a city filter AND locationRequirement filter simultaneously which incorrectly excludes remote jobs posted in a different city.

```typescript
// If user wants remote, do not apply city filter
if (intentData.locationRequirement === "remote") {
  strictWhere.locationRequirement = "remote";
  // Do NOT set strictWhere.city
} else if (intentData.city) {
  strictWhere.city = { contains: intentData.city.trim(), mode: "insensitive" };
  if (intentData.locationRequirement) {
    strictWhere.locationRequirement = intentData.locationRequirement;
  }
}
```

---

## 8. `agent/rankingEngine.ts` — Improved Scoring

### 8.1 Job ranking formula

Current: `0.5 semantic + 0.3 overlap + 0.2 recency`

Problems:
- Recency is over-weighted — a perfect match from 3 weeks ago loses to a weak match from yesterday
- Title tokens and description tokens weighted equally — title match should be 3x stronger
- No city exact match bonus

New formula:
```
finalScore = 0.55 × semanticScore 
           + 0.25 × weightedOverlapScore   ← title tokens weighted 3x description
           + 0.10 × recencyScore           ← reduced from 0.2
           + 0.10 × locationMatchScore     ← new: exact city or remote match
```

**Weighted overlap implementation:**
```typescript
function computeWeightedOverlapScore(
  queryTokens: string[],
  titleTokens: string[],
  descriptionTokens: string[],
  tagTokens: string[],
): number {
  const titleScore = computeOverlapScore(queryTokens, titleTokens);
  const descScore = computeOverlapScore(queryTokens, descriptionTokens);
  const tagScore = computeOverlapScore(queryTokens, tagTokens);
  // Title match is 3x more valuable than description
  return clamp01((3 * titleScore + descScore + 2 * tagScore) / 6);
}
```

**Location match bonus:**
```typescript
function computeJobLocationScore(
  preferredCity: string | null,
  preferredLocationReq: string | null,
  jobCity: string | null,
  jobLocationReq: string,
): number {
  // Remote requested + remote job = perfect
  if (preferredLocationReq === "remote" && jobLocationReq === "remote") return 1.0;
  // Remote requested + hybrid job = acceptable
  if (preferredLocationReq === "remote" && jobLocationReq === "hybrid") return 0.6;
  // City requested + exact city match = perfect
  if (preferredCity && jobCity) {
    const wanted = preferredCity.trim().toLowerCase();
    const got = jobCity.trim().toLowerCase();
    if (wanted === got) return 1.0;
    if (got.includes(wanted) || wanted.includes(got)) return 0.8;
  }
  // No location preference specified
  if (!preferredCity && !preferredLocationReq) return 0.5;
  return 0;
}
```

**Recency: extend half-life from 14 to 30 days:**
```typescript
// Current: 14-day half-life (too aggressive)
return clamp01(Math.exp((-Math.log(2) * ageDays) / 14));

// Better: 30-day half-life — good jobs posted a month ago still rank well
return clamp01(Math.exp((-Math.log(2) * ageDays) / 30));
```

### 8.2 Service ranking formula

Current: `0.25 semantic + 0.28 rating + 0.17 reviews + 0.15 location + 0.15 price`

Rating and reviews together = 0.45 which is too dominant. A highly rated service with zero relevance to the query ranks above a relevant service with fewer reviews.

New formula:
```
finalScore = 0.40 × semanticScore        ← relevance first
           + 0.20 × ratingScore          ← rating matters but not dominating
           + 0.15 × reviewsScore         ← social proof
           + 0.15 × locationScore        ← proximity
           + 0.10 × priceScore           ← price fit
```

---

## 9. `agent/scoreEngine.ts` — Resume Match Improvements

### 9.1 Current formula

```
resumeMatchScore = 0.6 × semantic_resume + 0.25 × skill_overlap + 0.15 × experience_alignment
blendedScore = 0.6 × finalScore + 0.4 × resumeMatchScore
```

### 9.2 Problems

- Experience alignment returns 0.5 as default when either level is null — this is noise, not signal. Use 0 when unknown.
- Skill overlap counts skills mentioned anywhere in tags — it should weight exact title matches higher
- blendedScore weights query relevance 60% vs resume 40%. When resume is strong, flip this.

### 9.3 Improved formula

```typescript
// If user has a strong resume (many skills, clear job title):
// Weight resume match more heavily
const hasStrongResume = resumeSkills.length >= 5;
const queryWeight = hasStrongResume ? 0.45 : 0.60;
const resumeWeight = hasStrongResume ? 0.55 : 0.40;

blendedScore = queryWeight × finalScore + resumeWeight × resumeMatchScore;
```

```typescript
// Experience alignment: return 0 when unknown, not 0.5
function computeExperienceAlignment(
  resumeLevel: string | null | undefined,
  jobLevel: string | null | undefined,
): number {
  const r = mapExperienceLevel(resumeLevel);
  const j = mapExperienceLevel(jobLevel);
  if (r == null || j == null) return 0; // unknown = no signal, not neutral
  const diff = Math.abs(r - j);
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.6;
  return 0.2; // 2+ levels apart = poor fit
}
```

---

## 10. Click Tracking — Frontend + Backend

### 10.1 Add EventName to your Prisma enum

In `schema.prisma`, add `CARD_CLICKED` to the `EventName` enum:

```prisma
enum EventName {
  AGENT_INTENT_TRIGGERED
  AGENT_SEARCH_RESULTS_RETURNED
  CARD_CLICKED              // ← ADD THIS
}
```

Run `npx prisma migrate dev` after.

### 10.2 New API route: `POST /api/events`

Create `app/api/events/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@workspace/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, intent, sessionId, data } = body;

    if (!name || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await (prisma as any).event.create({
      data: {
        userId: session.user.id,
        sessionId,
        name,
        intent: intent ?? null,
        source: "agent_chat",
        data: data ?? {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
```

### 10.3 Frontend — card click handler

In `agent-chat-container.tsx`, add a click handler wrapper around each card:

```typescript
function trackCardClick(opts: {
  cardId: string;
  cardPosition: number; // 0-indexed
  cardType: "job" | "service" | "task";
  searchQuery: string;
  matchScore: number | null;
  sessionId: string;
}) {
  // Fire and forget — never block the user click
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "CARD_CLICKED",
      intent: `search_${opts.cardType}`,
      sessionId: opts.sessionId,
      data: {
        cardId: opts.cardId,
        cardPosition: opts.cardPosition,
        cardType: opts.cardType,
        searchQuery: opts.searchQuery,
        matchScore: opts.matchScore,
      },
    }),
  }).catch(() => {}); // swallow errors silently
}
```

Wrap each card in the results map:

```tsx
<div
  key={item.id}
  className={cardWrap}
  onClick={() =>
    trackCardClick({
      cardId: item.id,
      cardPosition: index,
      cardType: message.results?.type === "jobs" ? "job"
               : message.results?.type === "services" ? "service" : "task",
      searchQuery: message.results?.query ?? "",
      matchScore: item.matchScore ?? null,
      sessionId: agentSessionId, // pass down from parent
    })
  }
>
```

---

## 11. `route.ts` — Final Shape (thin handler only)

After all the above, `route.ts` should only:

1. Parse request body
2. Auth check + rate limiting
3. Fetch resume data from DB
4. Call `shouldBypassIntentLlm()` from orchestrator
5. Call `extractIntent()` from intentExtractor
6. Call `checkScopeGuard()` from orchestrator
7. Call `checkJobSearchReadiness()` from orchestrator
8. Call search engine (job/service/task)
9. Call `generatePostResultNarrative()` — see below
10. Return response

It should import everything. It should write nothing.

### 11.1 Post-result narrative — replaces results-summary route

After getting cards back from the search engine, pass the top 3 as context to the intent extractor in a second, lightweight LLM call:

```typescript
async function generatePostResultNarrative(opts: {
  userMessage: string;
  searchQuery: string;
  intent: AgentIntent;
  items: any[];
  locale: string;
  hasResume: boolean;
}): Promise<string> {
  const context = {
    searchQuery: opts.searchQuery,
    intent: opts.intent,
    hasResume: opts.hasResume,
    topResults: opts.items.slice(0, 3).map((item, i) => ({
      position: i + 1,
      title: item.title,
      companyName: item.companyName ?? null,
      city: item.city ?? null,
      locationRequirement: item.locationRequirement ?? null,
      wage: item.wage ?? null,
      experienceLevel: item.experienceLevel ?? null,
      matchScore: item.matchScore ?? null,
      matchedSkills: item.resumeMatch?.matchedSkills ?? [],
      averageRating: item.averageRating ?? null,
      price: item.price ?? null,
    })),
  };

  const systemPrompt = buildPostResultNarrativePrompt();

  try {
    return await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(context) },
      ],
      { temperature: 0.5, maxTokens: 200 },
    );
  } catch {
    return ""; // silent fallback — cards still show
  }
}
```

### 11.2 `prompt/intent.ts` — add `buildPostResultNarrativePrompt`

```typescript
export function buildPostResultNarrativePrompt(): string {
  return `
You are Serrbi, a smart marketplace assistant.
You just ran a search and got the top results. Now tell the user what you found.

You receive JSON with: searchQuery, intent, hasResume, topResults (max 3).

LANGUAGE: Detect language from searchQuery. Respond in that language always.

STYLE:
- You are opinionated and helpful — like a smart friend who just searched for you
- Pick the strongest result and explain clearly why it stands out
- One sentence on what makes the others different
- End with one natural follow-up question — not a menu, one question
- Prose only — no bullet points, no headers, no lists
- 3-5 sentences total, maximum
- If hasResume is true, reference match percentage when mentioning the top result
- Never invent facts — use only what is in the provided results

NEVER start with: "Here are", "Voici", "إليك", "Here is a summary"
Get straight to your opinion.

Return only the message text. No JSON, no preamble.
`.trim();
}
```

---

## 12. Rendering Order in `agent-chat-container.tsx`

The post-result narrative (`message.content`) must render ABOVE the cards, not below.

Current wrong order:
```
1. Loading bar
2. Cards
3. message.content  ← WRONG: agent speaks after showing results
4. relatedPrompts pills
```

Correct order:
```
1. Loading bar (when loading)
2. message.content  ← FIRST: agent speaks, then shows what they found
3. Cards
4. Follow-up suggestions (text links, not pills)
```

For the follow-up suggestions: remove the pills entirely. The agent's `content` already contains the follow-up question naturally in the prose. If you still want clickable suggestions, render them as plain text links (↗ style) below the cards, not above.

---

## 13. Delete These Files

Once everything above is implemented and tested:

- `app/api/chat/results-summary/route.ts` — replaced by `generatePostResultNarrative` in route.ts
- The `callResultsSummary` function in `hero-search-bar.tsx` — no longer needed
- The `useEffect` that fires `callResultsSummary` after `topSearchLoading` — remove it
- `agent/prompt/suggestions.ts` — if it exists, delete it

---

## 14. QA Checklist

Run through every scenario before deploying:

| Scenario | Expected behavior |
|---|---|
| User: "Hi" (no scope) | Warm greeting, no search |
| User: "Hi" (jobs pinned) | Warm greeting, no search triggered |
| User: "je cherche un emploi" | Ask for domain + location, no cards |
| User: "je cherche un emploi tech" | Ask for location only, no cards |
| User: "tech developer remote" (no scope) | Search fires, cards + narrative |
| User: "استقبال فندق الدار البيضاء" | Category=Hospitality, city=Casablanca, search fires |
| User: "find me a remote job" | Ask for domain (remote is location ✓ but category missing) |
| User: "plumber in Rabat" (jobs pinned) | Scope guard: ambiguous? No — explicit service → confirm switch |
| User uploads resume, says "find me a job" | Resume context used, ask city/remote preference |
| User clicks card | CARD_CLICKED event stored with position + matchScore |
| User: "show me higher salary" (jobs pinned, >3 words) | Bypass LLM, carry category+location from context |
| 0 results from DB | Fallback relaxation: experienceLevel → type → wage → city → locationRequirement |

---

## 15. What NOT to Change

- `intentExtractor.ts` LLM calling logic and JSON parsing — it works
- `serviceSearchEngine.ts` filter relaxation logic — keep it, just remove the 90 cap
- `scoreEngine.ts` cosine similarity math — correct
- `rankingEngine.ts` `clamp01`, `cosineSimilarity`, `computeOverlapScore` — correct
- The resume upload flow in `hero-search-bar.tsx` — works correctly
- Session persistence logic — do not touch
- tRPC preview queries — do not touch
