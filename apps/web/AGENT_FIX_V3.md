# Agent Fix Plan — Resume Awareness + PinnedScope Switch + Card Type Bug
**Priority:** Critical — affects resume users and scope switching  
**Files:** `route.ts`, `prompt/intent.ts`, `hero-search-bar.tsx`, `agent-chat-container.tsx`

---

## Read These Files First

Before writing any code:
1. `app/api/chat/route.ts` — find `resumeProfile` construction and `extractorHistory` slice
2. `app/api/chat/agent/prompt/intent.ts` — find `resumeContext` block and `RESUME CONTEXT` section
3. `components/ui/hero-search-bar.tsx` — find `const tab: TabType = overrideIntent ?? pinnedIntent ?? agent.intent`
4. `components/ui/agent-chat-container.tsx` — find `message.results?.type === "jobs"` rendering block

---

## Fix 1 — Resume Awareness: Agent Must Know About Resume from First Message

### Root Cause
Two separate problems combine to cause this:

**Problem A:** `resumeProfile` is only passed to the LLM prompt when `resumeProfile.skills?.length || resumeProfile.job_title` is truthy. If `resumeJobTitle` is null in the DB (not stored during resume upload), the entire RESUME CONTEXT block is skipped. The LLM has no idea the user has a resume and asks for category.

**Problem B:** Even when resume IS passed, the LLM is combining the resume acknowledgment AND the location question into one message, making it feel robotic. The instruction needs to separate these two into distinct conversational steps.

### Diagnosis Step
Add this log in `route.ts` immediately after the `resumeProfile` is constructed:

```typescript
console.log("[resume-debug]", {
  hasResumeEmbedding,
  resumeJobTitle: userResumeData?.resumeJobTitle,
  autoApplyKeywords: userResumeData?.autoApplyKeywords,
  resumeProfilePassed: resumeProfile,
});
```

Run the scenario: user says "hey je cherche un emploi" with a resume uploaded.
Check if `resumeProfile` is null or if `job_title` is null. That tells you which problem you have.

### Fix A — Ensure `resumeJobTitle` is stored during resume upload

In your resume upload flow (wherever `extractResumeProfileFromRawText` is called and the result saved to DB), make sure `resumeJobTitle` is stored:

```typescript
// When saving resume profile to DB after extraction:
await db.user.update({
  where: { id: userId },
  data: {
    resumeUrl: uploadedUrl,
    resumeText: rawText,
    autoApplyKeywords: profile.skills,
    resumeJobTitle: profile.job_title,        // ← MUST be saved
    resumeEmbedding: embeddingVector,
  },
});
```

If `resumeJobTitle` column doesn't exist in your schema, add it:
```prisma
model User {
  // ... existing fields
  resumeJobTitle String?   // ← ADD THIS
}
```
Then run `npx prisma migrate dev`.

### Fix B — Proactive resume use: check hasResumeEmbedding, not just job_title

In `route.ts`, change the `resumeProfile` construction to be proactive:

```typescript
// BEFORE — only passes profile if embedding exists
const resumeProfile = hasResumeEmbedding
  ? {
      job_title: (userResumeData?.resumeJobTitle as string | undefined) ?? null,
      skills: (userResumeData?.autoApplyKeywords as string[] | undefined) ?? [],
      experience_level: null,
    }
  : null;

// AFTER — pass resume context whenever user has ANY resume data, not just embedding
// This ensures the LLM knows about the resume even if embedding generation failed
const hasAnyResumeData = !!(
  userResumeData?.resumeUrl ||
  userResumeData?.resumeJobTitle ||
  (Array.isArray(userResumeData?.autoApplyKeywords) && userResumeData.autoApplyKeywords.length > 0)
);

const resumeProfile = hasAnyResumeData
  ? {
      job_title: (userResumeData?.resumeJobTitle as string | undefined) ?? null,
      skills: (userResumeData?.autoApplyKeywords as string[] | undefined) ?? [],
      experience_level: null,
    }
  : null;
```

### Fix C — Update prompt to split resume acknowledgment from location question

In `prompt/intent.ts`, find the `RESUME-AWARE JOB SEARCH RULES` section and replace rule 2:

```
RESUME-AWARE JOB SEARCH RULES (override SEARCH READINESS for category):
1. When the user asks for a job WITHOUT specifying a category/domain
   AND the resume has a job_title → category IS known. Do NOT ask for category.

2. In this case:
   - type: "search_job"
   - intent_data.query: built from resume job title and top skills (bilingual)
   - intent_data.category: inferred from resume job title
   - reply: ONE short sentence ONLY. Acknowledge the resume and confirm searching.
     Do NOT ask about location in the reply. The system asks about location separately.
     
     CORRECT reply examples:
     (fr): "J'ai ton CV — je te cherche les meilleures offres de ${jobTitle} !"
     (en): "Got your resume — looking for ${jobTitle} positions for you!"
     (ar): "عندي سيرتك الذاتية — أبحث لك عن وظائف ${jobTitle} الآن!"
     
     WRONG reply (do NOT combine with location question):
     "J'ai ton CV ! Je te cherche... Préfères-tu travailler à Casablanca ou en remote ?"
     ← This is wrong because it mixes acknowledgment with a location question.
        The location question comes in a SEPARATE turn handled by the system.

3. Do NOT ask about location, city, or work mode in the reply when resume is present.
   The readiness check handles location separately after category is confirmed.

4. SPECIAL CASE — User explicitly mentions their resume ("tu as mon resume", "j'ai envoyé mon CV",
   "you have my resume", "عندك سيرتي"):
   This is NOT a greeting — it is a reminder that they have a resume.
   Treat it as implicitly requesting a job search using resume data.
   Return type: "search_job" with resume-based intent_data and an acknowledging reply.
   NEVER return type: "conversation" for this pattern.
```

### Fix D — Handle the "tu as mon resume" pattern in `route.ts`

The current code doesn't handle the case where user explicitly references their resume
as a standalone message. Add a pre-check before intent extraction:

```typescript
// In route.ts, before calling extractIntent:
// Detect if user is referencing their resume explicitly
const resumeReferencePatterns = [
  /tu as mon (cv|resume|curricul)/i,
  /you have my (cv|resume)/i,
  /j'ai envoy[ée] mon (cv|resume)/i,
  /عندك سيرت/,
  /لديك سيرت/,
  /عندي سيرة/,
];

const isResumeReference =
  resumeReferencePatterns.some(p => p.test(quickQuery)) && hasAnyResumeData;

// If user is referencing their resume and we have resume data,
// skip the LLM entirely and build intent from resume directly
if (isResumeReference && resumeProfile?.job_title) {
  const category = inferJobCategoryFromText(
    resumeProfile.job_title,
    resumeProfile.skills ?? [],
  ) ?? "Tech";
  
  // Build a natural acknowledgment via LLM
  const ackText = await callLLM(
    [
      {
        role: "system",
        content: `The user is reminding you they have a resume on file. 
You have their profile: job title "${resumeProfile.job_title}", 
skills: ${(resumeProfile.skills ?? []).slice(0, 5).join(", ")}.
Write ONE short, warm sentence in the user's language acknowledging you have their resume
and that you're about to search based on their profile.
Keep it under 12 words. No questions. Return only the message text.`,
      },
      { role: "user", content: quickQuery },
    ],
    { temperature: 0.4, maxTokens: 60 },
  ).catch(() => `Got it — searching for ${resumeProfile.job_title} positions for you!`);

  // Override aiResult with resume-based search intent
  // This bypasses the LLM intent extraction entirely for this pattern
  // The search will fire, then location gate will ask for city/remote preference
  aiResult = {
    type: "search_job",
    reply: ackText,
    intent_data: {
      query: `${resumeProfile.job_title} ${(resumeProfile.skills ?? []).slice(0, 5).join(" ")}`.trim(),
      category,
    } as JobIntentData,
    clarify_field: null,
  };
}
```

Place this block immediately after `aiResult` is assigned (after the bypass/extractIntent block),
before the scope guard check.

---

## Fix 2 — PinnedScope Not Switching After Explicit Intent Switch

### Root Cause
In `hero-search-bar.tsx`, this line:
```typescript
const tab: TabType = overrideIntent ?? pinnedIntent ?? agent.intent;
```

When `pinnedIntent = "jobs"` and `agent.intent = "services"` (after explicit switch in backend),
`tab` resolves to "jobs" because `pinnedIntent` is non-null and takes priority.

This causes:
- `tab` is "jobs" → `message.results.type` is set to "jobs" 
- Agent-chat-container renders `JobCard` for service results
- `pinnedIntent` never updates to "services"
- The badge still shows "Jobs"

### The Fix in `hero-search-bar.tsx`

Find the line:
```typescript
const tab: TabType = overrideIntent ?? pinnedIntent ?? agent.intent;
```

Replace with:
```typescript
// When the backend returns a different intent than the current pinnedScope,
// it means an explicit switch was approved — use the agent's intent.
// Only keep pinnedIntent when agent.intent matches it (normal same-scope search).
const tab: TabType =
  overrideIntent ??
  (agent.intent !== pinnedIntent && agent.action === "search" ? agent.intent : null) ??
  pinnedIntent ??
  agent.intent;
```

Then immediately after, add the pinnedIntent update:
```typescript
// Always sync pinnedIntent to the actual search type that ran
// This updates the badge and scope for future messages
if (tab !== pinnedIntent) {
  setPinnedIntent(tab);
  setActiveTab(tab);
}
```

This replaces the existing:
```typescript
if (!pinnedIntent && !overrideIntent) {
  setPinnedIntent(tab);
  setActiveTab(tab);
}
```

The change: instead of only setting pinnedIntent when it's null, always sync it
to whatever search type actually ran. This ensures the badge updates and future
messages use the correct scope.

---

## Fix 3 — Wrong Card Type Rendered for Service Results

### Root Cause
Direct consequence of Fix 2 — `tab` resolves to "jobs" so `message.results.type`
is "jobs". In `agent-chat-container.tsx`, the rendering uses:
```typescript
if (message.results?.type === "jobs") {
  return <JobCard ... />
}
```
Service data passed through `JobCard` renders incorrectly (missing fields, wrong layout).

### Fix in `hero-search-bar.tsx` — directResults branch

In the `directResults` branch, the type is taken from `tab` which is wrong.
Change to use `agent.results.type` directly as the source of truth for card type:

```typescript
// BEFORE
results: {
  key: resultsKey,
  query: q,
  type: tab,         // ← wrong when tab resolved to "jobs" but results are services
  items: cards,
  isLoading: false,
},

// AFTER
results: {
  key: resultsKey,
  query: q,
  type: agent.results.type,   // ← always use what the backend actually returned
  items: cards,
  isLoading: false,
},
```

Also update `resultsKey` to use `agent.results.type`:
```typescript
// BEFORE
const resultsKey = `${tab}|${q}`;

// AFTER
const resultType = agent.results?.type ?? tab;
const resultsKey = `${resultType}|${q}`;
```

---

## Fix 4 — Agent Conversation Feels Robotic and Not Anticipatory

### The Problem
The agent has access to resume data but waits for the user to mention it.
A smart agent should proactively acknowledge the resume in the very first relevant message.

### Fix in `route.ts` — inject resume awareness into conversation responses

When `aiResult.type === "conversation"` AND `hasAnyResumeData` is true AND the user
is asking about jobs (but vaguely), the agent should proactively reference the resume:

```typescript
if (aiResult.type === "conversation") {
  // If user is asking about jobs vaguely AND we have their resume,
  // treat this as an implicit job search request — no need to ask for category
  const isVagueJobRequest =
    hasAnyResumeData &&
    resumeProfile?.job_title &&
    /emploi|job|work|travail|وظيف|خدم/i.test(quickQuery) &&
    aiResult.clarify_field === "category";

  if (isVagueJobRequest) {
    // Redirect to search_job using resume data
    // The system will then ask for location only
    const category = inferJobCategoryFromText(
      resumeProfile!.job_title!,
      resumeProfile!.skills ?? [],
    ) ?? "Tech";

    const proactiveReply = await callLLM(
      [
        {
          role: "system",
          content: `The user wants a job and you have their resume on file.
Job title: "${resumeProfile!.job_title}". Skills: ${(resumeProfile!.skills ?? []).slice(0, 5).join(", ")}.
Write ONE short warm sentence in the user's language saying you see their profile
and you'll find matching jobs. Mention their job title. No questions.
Under 12 words. Return only the text.`,
        },
        { role: "user", content: quickQuery },
      ],
      { temperature: 0.4, maxTokens: 60 },
    ).catch(() => "");

    // Mutate aiResult to trigger a job search instead of asking for domain
    aiResult = {
      type: "search_job",
      reply: proactiveReply,
      intent_data: {
        query: `${resumeProfile!.job_title} ${(resumeProfile!.skills ?? []).slice(0, 5).join(" ")}`.trim(),
        category,
      } as JobIntentData,
      clarify_field: null,
    };
    // Fall through to the search_job block below
  } else {
    return NextResponse.json({
      action: "chat",
      intent: "jobs",
      searchQuery: "",
      assistantText: aiResult.reply || "How can I help you today?",
      relatedPrompts: [],
    } satisfies AgentResponse);
  }
}
```

---

## Fix 5 — Extract History Slice Is Too Short for Context Accumulation

### The Problem
`extractorHistory` is sliced to the last 4 messages:
```typescript
.slice(-4);
```

In a conversation like:
1. User: "je cherche un emploi" 
2. Agent: asks for domain
3. User: "dans la tech"
4. Agent: asks for location
5. User: "casablanca"

By message 5, the LLM only sees messages 3-5. Message 1 ("je cherche un emploi")
is dropped. This can cause context loss.

### Fix
Increase the history slice and make sure system-level assistant messages are filtered:

```typescript
const extractorHistory: IntentExtractorMessage[] = messages
  .filter((m): m is IntentExtractorMessage => {
    return (
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0 &&
      // Filter out thinking/loading placeholder messages
      m.content.trim().length > 3
    );
  })
  .slice(-8);  // increase from 4 to 8 — captures more context turns
```

---

## Verification Scenarios

### Scenario 1 — Resume awareness from first message
```
[User has resume: job_title="Full Stack Developer", skills=["React", "Node.js"]]

User: "hey je cherche un emploi"

Expected:
- Agent does NOT ask for category
- Agent acknowledges resume in one sentence
- Agent asks for location only (separate turn)
- Readiness check: category=Tech (from resume), location=null → asks for city/remote

WRONG behavior (before fix):
- "Dans quel domaine travailles-tu ?" ← should never happen with resume
```

### Scenario 2 — User explicitly references resume
```
User: "je cherche un emploi"
Agent: "Dans quel domaine ?"  ← (happens if Fix 1 not fully applied yet)
User: "tu as mon resume"

Expected:
- resumeReferencePattern matches
- isResumeReference = true
- aiResult overridden with search_job + resume-based intent_data
- Agent: "J'ai ton CV — je te cherche les meilleures offres de Full Stack Developer !"
- Readiness check fires → asks for location

WRONG behavior (before fix):
- "J'ai ton CV ! Je te cherche... Préfères-tu travailler à Casablanca ?"
  ← two things in one message
```

### Scenario 3 — Explicit service switch while jobs pinned
```
[pinnedIntent = "jobs"]

User: "trouve moi un plombier à Rabat"

Expected:
- isExplicitIntentSwitch detects "plombier" → service switch
- backend returns action:"search", intent:"services", results.type:"services"
- frontend: tab = "services" (from agent.intent, not pinnedIntent)
- setPinnedIntent("services") fires
- badge updates to "Services"
- 3 ServiceCards rendered correctly

WRONG behavior (before fix):
- tab = "jobs" (pinnedIntent overrides)
- message.results.type = "jobs"
- JobCard renders with service data → broken layout
- badge stays "Jobs"
```

### Scenario 4 — Normal same-scope follow-up (regression check)
```
[pinnedIntent = "jobs"]

User: "montre moi des postes senior"

Expected:
- agent.intent = "jobs" (same as pinnedIntent)
- tab = "jobs" (no change)
- pinnedIntent stays "jobs"
- badge stays "Jobs"
- JobCards rendered correctly

This must NOT break after Fix 2 is applied.
```

---

---

## Fix 6 — Smart Clarification: Stop Forcing LocationRequirement

### The Problem
`buildLocationClarifyMessage` always asks for BOTH city AND work mode (remote/hybrid/presentiel)
regardless of context. This is hardcoded and feels robotic. It also uses a crude language
detector (`/[\u0600-\u06ff]/` and French word list) to build the question — which is
exactly the pattern we eliminated from the rest of the codebase.

Real examples of when this is wrong:
- User: "Emplois à Rabat" → city is already given, asking for city again is absurd
- User: "استقبال فندق يوظف" → enough context to search (Hospitality job), asking for
  location when no location was given is acceptable, but asking for work mode too is excessive
- User: "graphic designer" → category is Tech/Creative, asking for location makes sense,
  but the question should feel natural, not like a form

### What the fix does
Replace the entire `buildLocationClarifyMessage` function with a smarter LLM call that:
1. Detects what is ACTUALLY missing (city only? work mode only? both?)
2. Asks only for what is needed
3. Never asks for something already implied
4. Sounds like a person, not a form

### Fix in `route.ts` — replace `buildLocationClarifyMessage`

Delete the existing function entirely. Replace with:

```typescript
async function buildSmartClarifyMessage(opts: {
  userMessage: string;
  intentData: JobIntentData;
  missingField: "category" | "location" | "both";
  existingReply?: string;
}): Promise<string> {
  // If LLM already wrote a good clarification in its reply, use it
  if (opts.existingReply?.trim()) return opts.existingReply.trim();

  const { intentData, missingField, userMessage } = opts;

  // Build context for the LLM so it can write a targeted question
  const knownContext = [
    intentData.category ? `domain: ${intentData.category}` : null,
    intentData.city ? `city: ${intentData.city}` : null,
    intentData.locationRequirement ? `work mode: ${intentData.locationRequirement}` : null,
    intentData.experienceLevel ? `level: ${intentData.experienceLevel}` : null,
    intentData.query ? `query: "${intentData.query}"` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const systemPrompt = `You are a helpful marketplace assistant in a chat.
The user wants a job. You already know some context: ${knownContext || "nothing yet"}.
You need to ask for: ${missingField === "both" ? "their domain AND preferred location" : missingField === "category" ? "their domain or field" : "their preferred location (city or work mode)"}.

Rules:
- Detect the language from the user's message and write in that language
- Ask ONLY for what is missing — never ask for something already known
- If asking for location: mention city examples AND remote/hybrid as options — but only if work mode is also unknown
- If asking for location AND city is already known: ask only about work mode (remote/hybrid/on-site)
- If asking for location AND work mode is already known: ask only about which city
- Keep it under 2 sentences. Sound like a curious helpful friend.
- Do NOT use bullet points or lists — one flowing question only
- Return only the question text, nothing else`;

  try {
    return await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.4, maxTokens: 80 },
    );
  } catch {
    // Minimal safe fallback — no language detection, just a neutral question
    if (missingField === "category") {
      return "What field are you looking for? (Tech, Finance, Health, Hospitality...)";
    }
    if (missingField === "location") {
      return "Which city do you prefer, or are you open to remote?";
    }
    return "What field and location are you looking for?";
  }
}
```

### Fix in `route.ts` — update the clarify call in the readiness block

Find the existing clarify block in the `search_job` section:
```typescript
if (!readiness.ready) {
  const llmReply = aiResult.reply?.trim();
  let clarifyText: string;
  if (readiness.missingField === "location") {
    const locationQ = await buildLocationClarifyMessage(lastUser);
    clarifyText = llmReply ? `${llmReply} ${locationQ}` : locationQ;
  } else {
    clarifyText = await buildJobClarifyMessage(lastUser);
  }
  ...
}
```

Replace with:
```typescript
if (!readiness.ready) {
  const clarifyText = await buildSmartClarifyMessage({
    userMessage: lastUser,
    intentData,
    missingField: readiness.missingField,
    existingReply: aiResult.reply?.trim(),
  });
  return NextResponse.json({
    action: "chat",
    intent: "jobs",
    searchQuery: "",
    assistantText: clarifyText,
    relatedPrompts: [],
  } satisfies AgentResponse);
}
```

This removes the two separate `buildLocationClarifyMessage` and `buildJobClarifyMessage`
functions entirely — one smart function handles all cases.

Also delete `buildLocationClarifyPrompt` from `prompt/intent.ts` since it is no longer used.

### Fix the readiness logic: locationRequirement is optional, not required

The current readiness check treats locationRequirement as a hard requirement.
It should not be. If the user gives a city, that is enough location context.
Work mode (remote/hybrid/in_office) is a preference, not a gate.

In `orchestrator.ts`, `checkJobSearchReadiness` currently has:
```typescript
const hasLocation = !!(
  (intentData.city?.trim() || null) ??
  (intentData.locationRequirement?.trim() || null) ??
  (intentData.stateAbbreviation?.trim() || null)
);
```

This is already correct — it accepts ANY of the three. The problem is not the logic
but the message. With the new `buildSmartClarifyMessage`, if city is given but
locationRequirement is not, the LLM will ask only "do you prefer remote or on-site?"
instead of the full location question. That's exactly the right behavior.

No change needed to `checkJobSearchReadiness` — Fix 6 is entirely in how the
clarify message is built.

---

## Fix 7 — Misclassified Queries: Service vs Task + Proximity Signals

### The Problem
These queries are being misclassified:

**"غسيل سيارة في موقعي"** (car wash near my location) → goes to `search_task`
Cause: "غسيل" (washing) is not in `SERVICE_CATEGORY_KEYWORDS` for AutomotiveTransport.
"في موقعي" (near me) is not recognized as a location signal.

**"أفضل خدمة"** (best service) → vague, no category, agent should ask what kind
Cause: no specific service keyword → falls through to fallback

**"ميكانيكي"** (mechanic, single word) → should trigger service search immediately
Cause: single word, might be classified as chat by `classifyTurnIntent` if word count <= 3

### Fix A — Add missing Arabic keywords to `keywords.ts`

In `SERVICE_CATEGORY_KEYWORDS`, under `AutomotiveTransport`, add:
```typescript
AutomotiveTransport: [
  // existing keywords...
  "غسيل سيارة", "غسيل السيارة", "غسيل",   // car wash
  "غسيل السيارات",                           // car washing (plural)
  "تغيير زيت", "تغيير الزيت",              // oil change
  "إطارات", "بنشر",                         // tires, puncture
  "كراج", "ورشة",                           // garage, workshop
],
```

Under `HomeMaintenance`, ensure these are present:
```typescript
HomeMaintenance: [
  // existing...
  "تصليح", "إصلاح",                        // repair (general)
  "سباكة", "كهرباء",                       // plumbing, electricity (noun forms)
],
```

### Fix B — Recognize proximity signals as valid location context

"في موقعي" / "قريب مني" / "near me" / "près de moi" / "à proximité" mean the user
wants results near their current location. The agent should treat this as a valid
location signal — not require a specific city.

In `orchestrator.ts`, extend `checkJobSearchReadiness` (for jobs) and add a
`checkServiceSearchReady` equivalent that recognizes proximity:

```typescript
// Add to keywords.ts
export const PROXIMITY_SIGNALS = [
  "near me", "nearby", "close to me", "around me",
  "في موقعي", "قريب مني", "بالقرب مني", "حولي",
  "près de moi", "à proximité", "autour de moi", "proche",
] as const;
```

In `orchestrator.ts`, update `checkJobSearchReadiness`:
```typescript
import { PROXIMITY_SIGNALS } from "./keywords";

export function checkJobSearchReadiness(intentData: JobIntentData): ReadinessResult {
  if (!intentData.query?.trim()) {
    return { ready: false, missingField: "category" };
  }

  const hasCategory =
    Boolean(intentData.category) ||
    inferJobCategoryFromText(intentData.query, intentData.skills ?? []) !== null;

  // Check explicit location fields
  const hasExplicitLocation = !!(
    (intentData.city?.trim() || null) ??
    (intentData.locationRequirement?.trim() || null) ??
    (intentData.stateAbbreviation?.trim() || null)
  );

  // Check for proximity signal in the query ("near me", "في موقعي", etc.)
  const hasProximitySignal = PROXIMITY_SIGNALS.some(signal =>
    intentData.query?.toLowerCase().includes(signal.toLowerCase())
  );

  const hasLocation = hasExplicitLocation || hasProximitySignal;

  if (!hasCategory && !hasLocation) return { ready: false, missingField: "both" };
  if (!hasCategory) return { ready: false, missingField: "category" };
  if (!hasLocation) return { ready: false, missingField: "location" };

  return { ready: true };
}
```

### Fix C — Single professional keywords must trigger search, not chat

"ميكانيكي" is 1 word. In `classifyTurnIntent`, messages with <= 3 words AND no
marketplace noun AND no search action get `chatScore += 2`, which pushes them toward chat.

"ميكانيكي" IS a service keyword but it's not in `MARKETPLACE_NOUNS` — it's in
`SERVICE_CATEGORY_KEYWORDS`. The classifier doesn't check service keywords for intent.

Fix in `classifier.ts`, in `classifyTurnIntent`:

```typescript
// After existing scoring, add:
// Check if the query contains a job or service category keyword
// Single professional terms ("ميكانيكي", "graphic designer", "plumber") are searches
const isJobCategoryKeyword = inferJobCategoryFromText(normalized) !== null;
const isServiceCategoryKeyword = inferServiceCategoryFromText(normalized) !== null;

if (isJobCategoryKeyword || isServiceCategoryKeyword) {
  searchScore += 3; // strong signal — professional keyword always means search
}
```

This makes "ميكانيكي", "graphic designer", "plumber", "comptable", "استقبال فندق"
all correctly score as search regardless of word count.

### Fix D — "غسيل سيارة في موقعي" must go to service, not task

The `fallbackExtractor` in `intentExtractor.ts` uses a simple regex:
```typescript
if (/(service|services|plumber|lawyer|doctor|electrician|خدمة|خدمات)/i.test(lowered)) {
  return { type: "search_service", ... };
}
```

This misses "غسيل سيارة" entirely, so it falls through to `search_job` default.

Fix in `intentExtractor.ts`, the `fallbackExtractor` function — extend the service regex:
```typescript
// BEFORE
if (/(service|services|plumber|lawyer|doctor|electrician|خدمة|خدمات)/i.test(lowered)) {

// AFTER — use inferServiceCategoryFromText which already has comprehensive keywords
import { inferServiceCategoryFromText } from "./classifier";

// In fallbackExtractor:
const inferredServiceCategory = inferServiceCategoryFromText(q);
if (inferredServiceCategory) {
  return { type: "search_service", reply: "", intent_data: { query: q } };
}
```

This makes the fallback use the same comprehensive keyword map instead of a
hand-written regex. Any query matching a service category keyword goes to service.

---

## Fix 8 — Full-Context Queries Must Search Immediately (No Clarification)

### The Problem
"Emplois à Rabat temps pleins en graphic design" contains everything:
- Intent: job search
- Location: Rabat
- Type: full-time
- Category: implied (graphic design → Tech or Digital)

But the agent might still ask a clarification question because `inferJobCategoryFromText`
doesn't map "graphic design" to any job category.

### Fix A — Add graphic design to job category keywords in `keywords.ts`

Graphic design for jobs maps to the existing `Tech` category or `Other`.
Add it to `Tech` since that's where creative/digital roles sit in your enum:

```typescript
Tech: [
  // existing keywords...
  "graphic designer", "graphiste", "graphic design", "مصمم جرافيك",
  "designer", "design graphique", "creative director", "directeur créatif",
  "ui designer", "ux designer", "ui/ux", "product designer",
  "motion designer", "illustrateur", "illustrator",
],
```

### Fix B — "temps pleins" / "full-time" / "part-time" are job type signals

These are currently not in `CONSTRAINT_SIGNALS` in `keywords.ts`, so they don't
boost search score. Add them:

```typescript
export const CONSTRAINT_SIGNALS = [
  // existing...
  "temps plein", "temps partiel", "full-time", "part-time",
  "full time", "part time", "دوام كامل", "دوام جزئي",
  "cdi", "cdd", "contrat", "stage", "internship",
] as const;
```

This also helps the `classifyTurnIntent` correctly classify job-type queries as search.

### Fix C — The LLM prompt already handles this via CONTEXT ACCUMULATION RULE

"Emplois à Rabat temps pleins en graphic design" is a single rich message.
The LLM's `CONTEXT ACCUMULATION RULE` in `buildIntentExtractorPrompt` already says
it must build intent_data from ALL user message content. With Fix 8A applied,
it will now correctly extract `category: Tech` from "graphic design" and return
`search_job` directly.

No additional prompt change needed — the keyword fix is the only change required.

---

## Fix 9 — "أفضل خدمة" and Other Vague Service Requests

### The Problem
"أفضل خدمة" (best service) is vague — no service category.
The agent should ask what kind of service, but naturally.

Services currently have no readiness check — they search immediately regardless
of how vague the query is. This can return irrelevant results.

### Add a lightweight service readiness check

In `orchestrator.ts`, add:

```typescript
export function checkServiceSearchReadiness(intentData: ServiceIntentData): 
  | { ready: true }
  | { ready: false; reason: "too_vague" } {
  
  const query = intentData.query?.trim() ?? "";
  
  // If serviceCategory was extracted → always ready
  if (intentData.serviceCategory) return { ready: true };
  
  // If query is very short and generic with no category keyword → ask for type
  const inferredCategory = inferServiceCategoryFromText(query);
  if (inferredCategory) return { ready: true };
  
  // Query is too vague — "أفضل خدمة", "best service", "un service"
  const isTooVague = query.split(" ").filter(Boolean).length <= 3 && !inferredCategory;
  if (isTooVague) return { ready: false, reason: "too_vague" };
  
  // Default: proceed — longer queries have enough semantic content for embedding search
  return { ready: true };
}
```

In `route.ts`, in the `search_service` block, add after `const intentData`:

```typescript
const serviceReadiness = checkServiceSearchReadiness(intentData);
if (!serviceReadiness.ready) {
  const clarifyText = await callLLM(
    [
      {
        role: "system",
        content: `The user wants a service but hasn't specified what kind.
Ask them naturally in their language what type of service they need.
Give 3-4 short examples relevant to a marketplace (plumber, car wash, graphic designer, tutor).
Keep it under 2 sentences. Sound like a helpful friend.
Return only the question text.`,
      },
      { role: "user", content: lastUser },
    ],
    { temperature: 0.4, maxTokens: 80 },
  ).catch(() => "What kind of service are you looking for?");

  return NextResponse.json({
    action: "chat",
    intent: "services",
    searchQuery: "",
    assistantText: clarifyText,
    relatedPrompts: [],
  } satisfies AgentResponse);
}
```

---

## Additional Verification Scenarios for Fixes 6-9

### Scenario 5 — Forced locationRequirement question (Fix 6)
```
User: "استقبال فندق يوظف"  (hotel reception hiring)

Expected:
- category = Hospitality (inferred from "فندق", "استقبال")
- location = null (not mentioned)
- readiness: category ✓, location ✗ → asks for location only
- clarify question: something like "في أي مدينة تبحث عن العمل؟ أو تفضل العمل عن بعد؟"
- NOT: "في أي مدينة تفضل العمل؟ (الدار البيضاء، الرباط...) أو تفضل العمل عن بعد؟"
  ← old hardcoded message should be gone
  
User: "الدار البيضاء"  (just says Casablanca)

Expected:
- city = Casablanca
- locationRequirement = null (not asked for, not blocking)
- readiness: both ✓ → search fires immediately
- Agent does NOT ask for remote/hybrid preference
```

### Scenario 6 — Car wash near me (Fix 7)
```
User: "غسيل سيارة في موقعي"

Expected:
- type: search_service (NOT search_task)
- serviceCategory: AutomotiveTransport
- "في موقعي" recognized as proximity signal
- search fires immediately, no clarification needed
```

### Scenario 7 — Single professional keyword (Fix 7C)
```
User: "ميكانيكي"

Expected:
- classifyTurnIntent → "search" (isServiceCategoryKeyword = true → searchScore +3)
- type: search_service
- serviceCategory: AutomotiveTransport
- search fires immediately

User: "graphic designer"

Expected:
- classifyTurnIntent → "search" (isJobCategoryKeyword = true → searchScore +3)
- type: search_job
- category: Tech
- readiness: category ✓, location ✗ → asks for location
```

### Scenario 8 — Full-context query (Fix 8)
```
User: "Emplois à Rabat temps pleins en graphic design"

Expected:
- category: Tech (from "graphic design" → Tech keyword)
- city: Rabat
- type: full_time (from "temps pleins")
- readiness: both ✓ → search fires immediately, NO clarification
- Agent reply: natural intro + 3 cards
```

### Scenario 9 — Vague service request (Fix 9)
```
User: "أفضل خدمة"

Expected:
- inferServiceCategoryFromText → null (no specific keyword)
- query word count = 2 → isTooVague = true
- serviceReadiness: not ready
- Agent: "ما نوع الخدمة التي تبحث عنها؟ (سباك، غسيل سيارة، مصمم، مدرس...)"

User: "غسيل سيارة"

Expected:
- inferServiceCategoryFromText → AutomotiveTransport (from "غسيل سيارة")
- serviceReadiness: ready
- search fires immediately
```

---

## Updated Summary Table

| Fix | File | Change |
|-----|------|--------|
| 1A | DB schema + resume upload | Store `resumeJobTitle` in User model |
| 1B | `route.ts` | Use `hasAnyResumeData` instead of `hasResumeEmbedding` for resumeProfile |
| 1C | `prompt/intent.ts` | Split resume ack from location question in RESUME CONTEXT rules |
| 1D | `route.ts` | Add `isResumeReference` pre-check to handle "tu as mon resume" pattern |
| 2  | `hero-search-bar.tsx` | Fix `tab` resolution — use `agent.intent` when it differs from `pinnedIntent` |
| 2  | `hero-search-bar.tsx` | Always sync `pinnedIntent` to `tab` after any search, not only when null |
| 3  | `hero-search-bar.tsx` | Use `agent.results.type` for `message.results.type`, not `tab` |
| 4  | `route.ts` | Proactively redirect vague job requests to search when resume has job_title |
| 5  | `route.ts` | Increase `extractorHistory` slice from 4 to 8 messages |
| 6A | `route.ts` | Replace `buildLocationClarifyMessage` with `buildSmartClarifyMessage` |
| 6B | `prompt/intent.ts` | Delete `buildLocationClarifyPrompt` (no longer needed) |
| 6C | `orchestrator.ts` | `locationRequirement` is optional — clarify message adapts to what is missing |
| 7A | `keywords.ts` | Add Arabic car wash + repair keywords to AutomotiveTransport |
| 7B | `keywords.ts` | Add proximity signals ("في موقعي", "near me") to new `PROXIMITY_SIGNALS` array |
| 7C | `orchestrator.ts` | Recognize proximity signals as valid location context in readiness check |
| 7D | `classifier.ts` | Single professional keywords score +3 search (fixes "ميكانيكي" misclassification) |
| 7E | `intentExtractor.ts` | `fallbackExtractor` uses `inferServiceCategoryFromText` instead of hardcoded regex |
| 8A | `keywords.ts` | Add graphic design, UI/UX, creative roles to Tech category keywords |
| 8B | `keywords.ts` | Add job type signals (temps plein, CDI, full-time) to `CONSTRAINT_SIGNALS` |
| 9  | `orchestrator.ts` | Add `checkServiceSearchReady` — ask what kind when service query is too vague |
| 9  | `route.ts` | Call `checkServiceSearchReady` in search_service block before running search engine |