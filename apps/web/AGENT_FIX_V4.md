# Service & Job Intelligence Pipeline — Serrbi
**Real goal:** When a user says anything, the system understands what they need
and instantly connects them to the right job or service in the database.

**The translation problem:**
```
"kan 7taj chi wahed ydirli plomberie"  ──┐
"i need someone to fix my sink"         ├──→ { serviceCategory: "HomeMaintenance", type: "plumber" }
"cherche plombier urgent"               ──┘
```

---

## Read These Files First

Before writing any code:
1. `app/api/chat/agent/keywords.ts` — current keyword arrays
2. `app/api/chat/agent/classifier.ts` — current classification functions
3. `app/api/chat/agent/serviceSearchEngine.ts` — how `type` and `serviceCategory` are used in DB queries
4. `app/api/chat/agent/jobSearchEngine.ts` — same for jobs
5. `prisma/schema.prisma` — Service model, Job model, field types
6. Your actual DB data — run these queries before starting:
   ```sql
   SELECT DISTINCT type, "serviceCategory", COUNT(*) as count
   FROM "Service"
   GROUP BY type, "serviceCategory"
   ORDER BY count DESC;

   SELECT DISTINCT category, COUNT(*) as count
   FROM "Job"
   GROUP BY category
   ORDER BY count DESC;
   ```
   You need to see what actual type values exist before building anything.

---

## Phase 0 — Understand Your Data First (Do This Before Any Code)

This is the most important phase. Everything else depends on knowing what
types and categories actually exist in your database.

### Step 0.1 — Export your raw service types
Run:
```sql
SELECT
  "serviceCategory",
  type,
  title,
  COUNT(*) as count
FROM "Service"
WHERE status = 'published'
GROUP BY "serviceCategory", type, title
ORDER BY "serviceCategory", count DESC;
```

Export to CSV. You will see things like:
- Empty type fields
- Inconsistent casing ("Plumber" vs "plumber" vs "PLOMBIER")
- Free text descriptions used as type ("Plomberie et installation")
- Duplicates that mean the same thing

### Step 0.2 — Export your raw job types
Run:
```sql
SELECT
  category,
  type,
  "experienceLevel",
  COUNT(*) as count
FROM "Job"
WHERE status = 'published'
GROUP BY category, type, "experienceLevel"
ORDER BY category, count DESC;
```

### Step 0.3 — Identify gaps in your enum coverage
Look at your data and ask:
- Which categories have the most services/jobs?
- Which `type` values are empty or garbage?
- Which user queries from your Event logs didn't find results?

Run this on your Event table:
```sql
SELECT
  data->>'query' as query,
  data->>'resultsCount' as results,
  "createdAt"
FROM "Event"
WHERE name = 'AGENT_SEARCH_RESULTS_RETURNED'
  AND (data->>'resultsCount')::int = 0
ORDER BY "createdAt" DESC
LIMIT 50;
```

These zero-result queries are your most valuable data. They tell you exactly
where your system is failing.

---

## Phase 1 — Build `serviceTypes.json` (The Dictionary)

This is the canonical bridge between human language and your DB.

### Structure
```json
[
  {
    "key": "plumber",
    "category": "HomeMaintenance",
    "dbTypeValues": ["plumber", "plombier", "plomberie"],
    "labels": {
      "en": ["plumber", "plumbing", "pipe repair", "fix pipes", "leaking pipe", "sink repair"],
      "fr": ["plombier", "plomberie", "fuite d'eau", "robinet", "tuyauterie"],
      "ar": ["سباك", "سباكة", "تصليح تسرب", "تسرب مياه", "إصلاح حنفية"],
      "darija": ["سباك", "سبّاك", "تصليح ليو", "chi wahed ydirli plomberie"]
    }
  },
  {
    "key": "electrician",
    "category": "HomeMaintenance",
    "dbTypeValues": ["electrician", "electricien", "electrical"],
    "labels": {
      "en": ["electrician", "electrical work", "wiring", "power outage", "electrical repair"],
      "fr": ["électricien", "électricité", "panne de courant", "installation électrique"],
      "ar": ["كهربائي", "كهرباء", "عطل كهربائي", "تركيب كهرباء"],
      "darija": ["كهربائي", "كهرباء خاصني", "chi wahed dial lektrika"]
    }
  },
  {
    "key": "beauty_salon",
    "category": "BeautyPersonalCare",
    "dbTypeValues": ["beauty_salon", "salon", "coiffeur", "hairdresser"],
    "labels": {
      "en": ["beauty salon", "hair salon", "hairdresser", "haircut", "hair styling"],
      "fr": ["salon de beauté", "coiffeur", "coiffure", "salon coiffure"],
      "ar": ["صالون تجميل", "حلاق", "كوافير", "صالون حلاقة"],
      "darija": ["koifir", "salon", "shi wahed yqss shi'ri"]
    }
  },
  {
    "key": "dentist",
    "category": "HealthWellness",
    "dbTypeValues": ["dentist", "dentiste", "dental"],
    "labels": {
      "en": ["dentist", "dental", "tooth pain", "tooth doctor", "teeth", "cavity", "toothache"],
      "fr": ["dentiste", "dentisterie", "mal aux dents", "soins dentaires"],
      "ar": ["طبيب أسنان", "أسنان", "ألم أسنان", "تسوس"],
      "darija": ["tabib dial snane", "snani", "dktour dial snane", "dent"]
    }
  },
  {
    "key": "car_wash",
    "category": "AutomotiveTransport",
    "dbTypeValues": ["car_wash", "car wash", "lavage voiture"],
    "labels": {
      "en": ["car wash", "car cleaning", "auto wash", "vehicle cleaning"],
      "fr": ["lavage voiture", "lavage auto", "nettoyage véhicule"],
      "ar": ["غسيل سيارة", "غسيل السيارات", "تنظيف السيارة"],
      "darija": ["ghassil tumbil", "ghassil sayara", "ghssal"]
    }
  }
]
```

### Key rules for building this dictionary:
- `key` is the canonical identifier — lowercase, snake_case, English always
- `dbTypeValues` lists all the actual values in your DB `type` column for this concept
- `labels` are synonyms users would say — NOT technical names
- `darija` is a separate key because Moroccan Arabic has unique patterns not in standard Arabic
- Add at least 5 labels per language per type
- Focus on what users SAY, not what providers call their service

### How many types to cover?
Look at your Phase 0 data. Cover the top 80% of your service types by count.
You probably have 15-30 meaningful types. Build all of them.

---

## Phase 2 — Build `jobTypes.json`

Same structure as serviceTypes but for jobs. Your job categories are already
well-defined enums, so this is simpler — you're mostly adding multilingual
search synonyms.

```json
[
  {
    "key": "frontend_developer",
    "category": "Tech",
    "labels": {
      "en": ["frontend developer", "front-end developer", "react developer", "vue developer", "ui developer", "web developer"],
      "fr": ["développeur frontend", "développeur front-end", "développeur web", "intégrateur web"],
      "ar": ["مطور واجهات", "مطور فرونت", "مطور ويب"],
      "darija": ["dev frontend", "mwtr frontend", "programmeur web"]
    }
  },
  {
    "key": "graphic_designer",
    "category": "Tech",
    "labels": {
      "en": ["graphic designer", "designer", "ui designer", "ux designer", "creative designer", "visual designer"],
      "fr": ["graphiste", "designer graphique", "design graphique", "créatif"],
      "ar": ["مصمم جرافيك", "مصمم", "مصمم ويب"],
      "darija": ["disiner", "graphiste", "mwtr graphic"]
    }
  },
  {
    "key": "hotel_receptionist",
    "category": "Hospitality",
    "labels": {
      "en": ["receptionist", "hotel receptionist", "front desk", "hotel staff", "reception"],
      "fr": ["réceptionniste", "accueil hôtel", "agent d'accueil"],
      "ar": ["موظف استقبال", "استقبال فندق", "مستقبل"],
      "darija": ["réception", "استقبال", "استقبال فندق يوظف"]
    }
  }
]
```

---

## Phase 3 — Update `keywords.ts` to Use the Dictionaries

Replace the static `JOB_CATEGORY_KEYWORDS` and `SERVICE_CATEGORY_KEYWORDS`
objects with functions that read from the JSON dictionaries.

```typescript
// In keywords.ts — add at top:
import serviceTypesData from "./serviceTypes.json";
import jobTypesData from "./jobTypes.json";

// Build a flat lookup: label → { key, category }
// This is built once at startup, not on every request
export const SERVICE_LABEL_INDEX = buildLabelIndex(serviceTypesData);
export const JOB_LABEL_INDEX = buildLabelIndex(jobTypesData);

function buildLabelIndex(
  types: Array<{ key: string; category: string; labels: Record<string, string[]> }>
): Map<string, { key: string; category: string }> {
  const index = new Map<string, { key: string; category: string }>();
  for (const type of types) {
    for (const [lang, labelList] of Object.entries(type.labels)) {
      for (const label of labelList) {
        // Store normalized versions of all labels
        const normalized = label
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
        if (!index.has(normalized)) {
          index.set(normalized, { key: type.key, category: type.category });
        }
      }
    }
  }
  return index;
}
```

### Update `classifier.ts` to use the index:

```typescript
// Replace inferServiceCategoryFromText with:
export function classifyServiceQuery(query: string): {
  category: string;
  typeKey: string;
} | null {
  const normalized = normalizeForIntent(query);

  // Check every token and sub-phrase in the query against the label index
  const words = normalized.split(" ");
  
  // Try multi-word phrases first (more specific)
  for (let len = 4; len >= 1; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(" ");
      const match = SERVICE_LABEL_INDEX.get(phrase);
      if (match) return { category: match.category, typeKey: match.key };
    }
  }
  return null;
}

// Replace inferJobCategoryFromText with:
export function classifyJobQuery(query: string, skills?: string[]): {
  category: string;
  typeKey: string;
} | null {
  const text = `${query} ${(skills ?? []).join(" ")}`;
  const normalized = normalizeForIntent(text);
  const words = normalized.split(" ");

  for (let len = 4; len >= 1; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(" ");
      const match = JOB_LABEL_INDEX.get(phrase);
      if (match) return { category: match.category, typeKey: match.key };
    }
  }
  return null;
}
```

The multi-word-first approach means "tooth doctor" matches "dentist" before
"doctor" alone matches "HealthWellness" with no type. More specific matches win.

---

## Phase 4 — Update `serviceSearchEngine.ts` to Use Type Keys

The dictionary only helps if the DB query actually uses the `type` field.
Currently `serviceSearchEngine.ts` mostly relies on `serviceCategory` and
vector similarity. Add the `typeKey` as an additional filter:

```typescript
// In serviceSearchEngine.ts:
export async function serviceSearchEngine(
  db: PrismaClient,
  intentData: ServiceIntentData,
): Promise<ServiceSearchResult> {
  // ... existing filter building ...

  // NEW: if a specific type key was extracted, add it as a filter
  if (intentData.typeKey) {
    // Find all dbTypeValues for this typeKey from the dictionary
    const typeEntry = serviceTypesData.find(t => t.key === intentData.typeKey);
    if (typeEntry && typeEntry.dbTypeValues.length > 0) {
      where.type = { in: typeEntry.dbTypeValues, mode: "insensitive" };
    }
  }
  
  // ... rest of existing logic unchanged ...
}
```

### Add `typeKey` to `ServiceIntentData` in `intentExtractor.ts`:

```typescript
export type ServiceIntentData = {
  query: string;
  serviceCategory?: string | null;
  typeKey?: string | null;        // ← ADD THIS
  type?: string | null;
  city?: string | null;
  // ... existing fields
};
```

### Pass `typeKey` from classifier in `route.ts`:

```typescript
// In route.ts, in the search_service block:
// After extracting intent, enrich with classifier result
if (aiResult.type === "search_service" && aiResult.intent_data) {
  const intentData = aiResult.intent_data as ServiceIntentData;
  
  // If LLM didn't extract a typeKey, try the classifier
  if (!intentData.typeKey) {
    const classified = classifyServiceQuery(lastUser);
    if (classified) {
      intentData.typeKey = classified.typeKey;
      // Also set category if not already set
      if (!intentData.serviceCategory) {
        intentData.serviceCategory = classified.category;
      }
    }
  }
}
```

---

## Phase 5 — Update the LLM Prompt to Know About Types

Pass the available type keys to the LLM so it can extract them directly
instead of relying on free-form type extraction.

In `prompt/intent.ts`, update `buildIntentExtractorPrompt` to include
available service types:

```typescript
// Add to the FIELD MAP section of the prompt:
`search_service intent_data fields:
  query (string, required)
  serviceCategory (enum: HomeMaintenance | ConstructionInstallation | HealthWellness |
    BeautyPersonalCare | EventsMedia | FoodCatering | DigitalCreative |
    LegalFinance | EducationCoaching | AutomotiveTransport | Other)
  typeKey (string | null) — canonical service type key if detectable:
    HomeMaintenance: plumber, electrician, painter, carpenter, locksmith, cleaning, handyman
    AutomotiveTransport: car_wash, mechanic, driver, towing
    HealthWellness: dentist, doctor, nurse, therapist, nutritionist
    BeautyPersonalCare: beauty_salon, barber, makeup_artist, nail_technician
    DigitalCreative: graphic_designer, web_developer, photographer, video_editor
    EducationCoaching: tutor, language_teacher, driving_instructor, sports_coach
    LegalFinance: lawyer, accountant, notary, tax_advisor
    FoodCatering: caterer, personal_chef, bakery
    EventsMedia: event_planner, dj, wedding_photographer
    ConstructionInstallation: architect, contractor, tile_installer, painter
  city, stateAbbreviation, minPrice, maxPrice, minAverageRating, minNumberOfReviews`
```

Now the LLM can directly say `typeKey: "plumber"` instead of `type: "Plomberie et installation"`.

---

## Phase 6 — Normalize Your Database (One-Time Migration)

After the dictionary is built, run a migration to normalize the `type` field
in your existing Service and Job records to match the canonical keys.

### Step 6.1 — Create a normalization script

```typescript
// scripts/normalizeServiceTypes.ts
import { prisma } from "@workspace/db";
import serviceTypesData from "../app/api/chat/agent/serviceTypes.json";
import { classifyServiceQuery } from "../app/api/chat/agent/classifier";

async function normalizeServiceTypes() {
  const services = await prisma.service.findMany({
    select: { id: true, type: true, title: true, description: true, serviceCategory: true },
  });

  console.log(`Found ${services.length} services to process`);
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const service of services) {
    const searchText = `${service.type ?? ""} ${service.title} ${service.description ?? ""}`;
    const classified = classifyServiceQuery(searchText);

    if (classified) {
      // Find the canonical type entry
      const typeEntry = serviceTypesData.find(t => t.key === classified.typeKey);
      if (typeEntry) {
        await prisma.service.update({
          where: { id: service.id },
          data: { type: typeEntry.key }, // store canonical key
        });
        updated++;
      }
    } else {
      unchanged++;
      // Log for manual review
      console.log(`[UNMATCHED] id=${service.id} type="${service.type}" title="${service.title}"`);
    }
  }

  console.log(`Done. Updated: ${updated}, Unchanged: ${unchanged}, Failed: ${failed}`);
}

normalizeServiceTypes();
```

Run with: `npx ts-node scripts/normalizeServiceTypes.ts`

**Do NOT run this on production without first running on a test DB.**
**Back up your data before running.**

### Step 6.2 — Review unmatched services manually

The script logs unmatched services. For each one:
- Does it belong in an existing type? Add its label to the dictionary.
- Is it a new type? Add it to the dictionary first, then re-run.
- Is it truly uncategorizable? Leave it — the vector search will handle it.

---

## Phase 7 — Add Type Embeddings to the Search Index

Your current vector search compares user query embedding against
service/job description embeddings. This works for semantic meaning
but can miss when the description doesn't use the user's phrasing.

Add type label embeddings as a secondary index:

```typescript
// When a service is created or type is updated, also store
// embeddings of all labels for its type key
// This is a background job, not blocking

async function enrichServiceWithTypeEmbedding(serviceId: string, typeKey: string) {
  const typeEntry = serviceTypesData.find(t => t.key === typeKey);
  if (!typeEntry) return;

  // Combine all labels into a representative text
  const allLabels = Object.values(typeEntry.labels).flat().join(" ");
  const embedding = await embedText(allLabels);
  
  await prisma.service.update({
    where: { id: serviceId },
    data: { typeEmbedding: embedding }, // requires new field in schema
  });
}
```

For the ranking engine, blend the type embedding similarity with the
description embedding similarity:

```typescript
// In rankServices():
const descriptionSimilarity = cosineSimilarity(queryEmbedding, item.embedding);
const typeSimilarity = item.typeEmbedding?.length
  ? cosineSimilarity(queryEmbedding, item.typeEmbedding)
  : 0;

// Type embedding is more specific — weight it higher
const semanticScore = 0.4 * descriptionSimilarity + 0.6 * typeSimilarity;
```

---

## Phase 8 — Close the Feedback Loop

Your CARD_CLICKED events now store `cardId`, `cardPosition`, `searchQuery`.
Use this data to improve the dictionary continuously.

### Step 8.1 — Identify missing synonyms
```sql
-- Queries that led to a click at position 2 or 3 (not position 0)
-- These suggest the top result was wrong — ranking or matching issue
SELECT
  data->>'searchQuery' as query,
  data->>'cardPosition' as position,
  COUNT(*) as clicks
FROM "Event"
WHERE name = 'CARD_CLICKED'
  AND (data->>'cardPosition')::int > 0
GROUP BY data->>'searchQuery', data->>'cardPosition'
ORDER BY clicks DESC
LIMIT 20;
```

If "coiffeur" always leads to clicks at position 2, your "coiffeur" → "beauty_salon"
mapping is either missing or the beauty_salon DB entries don't use "coiffeur" anywhere.

### Step 8.2 — Identify zero-result queries periodically
Re-run the zero-results query from Phase 0 monthly.
Each zero-result query is a synonym or type you haven't covered yet.
Add it to the dictionary. Redeploy. Done.

---

## The Final System Flow

```
User: "kan 7taj chi wahed ydirli plomberie"
         ↓
classifyServiceQuery() checks label index
  → "plomberie" matches "plumber" (darija labels)
  → returns { category: "HomeMaintenance", typeKey: "plumber" }
         ↓
checkServiceSearchReadiness()
  → serviceCategory ✓, typeKey ✓, location = null
  → asks: "Dans quelle ville ?" or "Quelle zone ?"
         ↓
User: "Casablanca"
         ↓
serviceSearchEngine() runs with:
  WHERE serviceCategory = "HomeMaintenance"
    AND type IN ["plumber", "plombier", "plomberie"]  ← from dbTypeValues
    AND city ILIKE "%casablanca%"
  + vector similarity ranking on query embedding
         ↓
generatePostResultNarrative() writes:
  "Le meilleur résultat est Ahmed Plomberie à Casablanca — 
   4.8 étoiles, 67 avis, disponible rapidement. Les deux autres 
   sont un peu moins bien notés mais peuvent intervenir plus vite. 
   Tu veux que je filtre par disponibilité immédiate ?"
         ↓
User thinks: "this app understands me"
```

---

## Implementation Order

Do these in order. Each phase depends on the previous one.

| Phase | What | Why first |
|-------|------|-----------|
| 0 | Query your DB, see real data | Can't build dictionary without knowing what types exist |
| 1 | Build `serviceTypes.json` | Foundation for everything else |
| 2 | Build `jobTypes.json` | Same foundation for jobs |
| 3 | Update `keywords.ts` to use dictionary | Replace static keywords with dynamic index |
| 4 | Update `serviceSearchEngine.ts` to use typeKey | Dictionary only helps if it filters the DB |
| 5 | Update LLM prompt with type keys | LLM can now extract canonical types directly |
| 6 | Run DB normalization script | Align existing data with dictionary |
| 7 | Add type embeddings | Better semantic matching for novel phrasing |
| 8 | Monthly: review zero results + clicks | Continuous improvement |

---

## What NOT to Do

- **Do NOT store synonyms in the Service DB rows.** The dictionary is the single source of truth for synonyms.
- **Do NOT run the normalization script on production without a backup.** Test it first.
- **Do NOT try to cover 100% of types before launching.** Cover your top 20 types. The vector search handles the rest.
- **Do NOT replace the vector search with keyword matching.** They work together. Keywords are fast and precise for known types. Vector handles the unknowns.
- **Do NOT skip Phase 0.** Building a dictionary without looking at your actual data is guesswork.

## 🚨 IMPLEMENTATION RULE

DO NOT implement all phases at once.

Work in this exact order:

1. Phase 3 (dictionary + classifier integration)
2. Phase 4 (search engine filter)
3. Test manually
4. Then continue

Each phase must be tested before moving to the next.