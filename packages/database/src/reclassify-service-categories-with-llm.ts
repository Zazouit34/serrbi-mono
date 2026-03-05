import { prisma } from "./client";

const TARGET_CATEGORIES = [
  "HomeMaintenance",
  "ConstructionInstallation",
  "HealthWellness",
  "BeautyPersonalCare",
  "EventsMedia",
  "FoodCatering",
  "DigitalCreative",
  "LegalFinance",
  "EducationCoaching",
  "AutomotiveTransport",
  "Other",
] as const;

type TargetCategory = (typeof TARGET_CATEGORIES)[number];

const CATEGORY_DESCRIPTIONS: Record<TargetCategory, string> = {
  HomeMaintenance:
    "Home & maintenance services (plumber, electrician, painter, carpenter, locksmith, cleaning, small repairs).",
  ConstructionInstallation:
    "Construction and installation projects (architect, mason, renovation, pools, elevators, security systems).",
  HealthWellness:
    "Health and wellness professionals (doctor, nurse, therapist, nutritionist, fitness coach, clinics).",
  BeautyPersonalCare:
    "Beauty and personal care services (hairstylist, barber, makeup, esthetician, spa).",
  EventsMedia:
    "Events and media services (event planner, wedding services, decorator, photographer, videographer, DJ).",
  FoodCatering:
    "Food and catering services (chef, caterer, pastry, meal prep, restaurant services).",
  DigitalCreative:
    "Digital and creative services (graphic design, web/dev, social media, marketing, content creator).",
  LegalFinance:
    "Legal and finance services (lawyer, legal advisor, accountant, tax/finance services).",
  EducationCoaching:
    "Education and coaching services (teacher, tutor, trainer, coach, educational support).",
  AutomotiveTransport:
    "Automotive and transport services (mechanic, car diagnostic, driver, transport services).",
  Other: "Use only when no category clearly fits.",
};

const LEGACY_SPECIFIC_CATEGORIES = new Set([
  "Lawyer",
  "Doctor",
  "Education",
  "Architect",
  "Plumber",
  "Electrician",
  "Mason",
  "Mechanic",
  "Accountant",
  "Esthetician",
  "Cleaning",
]);

/** When legacy category is this, only accept these target categories from LLM; otherwise use fallback. */
const LEGACY_TO_PLAUSIBLE_TARGETS: Record<string, TargetCategory[]> = {
  Lawyer: ["LegalFinance", "Other"],
  Doctor: ["HealthWellness", "Other"],
  Education: ["EducationCoaching", "Other"],
  Architect: ["ConstructionInstallation", "DigitalCreative", "Other"],
  Plumber: ["HomeMaintenance", "ConstructionInstallation", "Other"],
  Electrician: ["HomeMaintenance", "ConstructionInstallation", "Other"],
  Mason: ["ConstructionInstallation", "HomeMaintenance", "Other"],
  Mechanic: ["AutomotiveTransport", "Other"],
  Accountant: ["LegalFinance", "Other"],
  Esthetician: ["BeautyPersonalCare", "Other"],
  Cleaning: ["HomeMaintenance", "Other"],
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isTargetCategory(value: unknown): value is TargetCategory {
  return typeof value === "string" && TARGET_CATEGORIES.includes(value as TargetCategory);
}

function safeType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

function defaultTypeFromCurrent(serviceCategory: string, type: string | null): string | null {
  if (type && type.trim()) return type.trim().slice(0, 120);
  if (LEGACY_SPECIFIC_CATEGORIES.has(serviceCategory)) return serviceCategory;
  return null;
}

function fallbackCategoryFromText(text: string): TargetCategory {
  const normalized = normalizeText(text);

  const checks: Array<{ category: TargetCategory; keywords: string[] }> = [
    {
      category: "HomeMaintenance",
      keywords: ["plumber", "plombier", "electrician", "electricien", "painter", "carpenter", "locksmith", "cleaning", "nettoyage", "maintenance"],
    },
    {
      category: "ConstructionInstallation",
      keywords: ["construction", "architect", "architecture", "mason", "renovation", "elevator", "pool", "security system"],
    },
    {
      category: "HealthWellness",
      keywords: ["doctor", "medecin", "medical", "health", "nurse", "therap", "nutrition", "fitness", "clinic", "dentist"],
    },
    {
      category: "BeautyPersonalCare",
      keywords: ["beauty", "beaute", "hairstylist", "barber", "makeup", "esthetician", "spa", "coiffure"],
    },
    {
      category: "EventsMedia",
      keywords: ["event", "wedding", "decor", "photographer", "videographer", "dj", "music"],
    },
    {
      category: "FoodCatering",
      keywords: ["food", "cater", "chef", "bakery", "restaurant", "traiteur"],
    },
    {
      category: "DigitalCreative",
      keywords: ["design", "graphic", "digital", "developer", "web", "marketing", "social media", "content creator", "seo"],
    },
    {
      category: "LegalFinance",
      keywords: ["lawyer", "avocat", "legal", "juridique", "accountant", "comptable", "finance", "tax"],
    },
    {
      category: "EducationCoaching",
      keywords: ["education", "teacher", "prof", "tutor", "coach", "formation", "training"],
    },
    {
      category: "AutomotiveTransport",
      keywords: ["mechanic", "mecanicien", "garage", "auto", "car", "driver", "transport"],
    },
  ];

  for (const check of checks) {
    if (check.keywords.some((keyword) => normalized.includes(keyword))) {
      return check.category;
    }
  }
  return "Other";
}

async function callClassifierLlm(messages: Array<{ role: "system" | "user"; content: string }>): Promise<string> {
  const url = getRequiredEnv("CHAT_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  const model = "qwen3-32b";

  let response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: { messages },
      parameters: {
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 1400,
        result_format: "message",
        enable_thinking: false,
      },
    }),
  });

  if (!response.ok) {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 1400,
        enable_thinking: false,
      }),
    });
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Category LLM error ${response.status}: ${details}`);
  }

  const payload: any = await response.json();
  const content =
    payload?.output?.choices?.[0]?.message?.content ??
    payload?.output?.text ??
    payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.text;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Category LLM returned empty content");
  }
  return content;
}

function parseClassifierOutput(raw: string): Array<{ id: string; category: TargetCategory; type: string | null }> {
  const firstBracket = raw.indexOf("[");
  const lastBracket = raw.lastIndexOf("]");
  const jsonSlice =
    firstBracket !== -1 && lastBracket !== -1 ? raw.slice(firstBracket, lastBracket + 1) : raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      const obj = (item ?? {}) as Record<string, unknown>;
      const id = typeof obj.id === "string" ? obj.id : null;
      const category = obj.category;
      const type = safeType(obj.type);
      if (!id || !isTargetCategory(category)) return null;
      return { id, category, type };
    })
    .filter((x): x is { id: string; category: TargetCategory; type: string | null } => Boolean(x));
}

async function classifyBatchWithLlm(
  items: Array<{
    id: string;
    title: string;
    description: string;
    serviceCategory: string;
    type: string | null;
    city: string | null;
    price: number | null;
  }>,
): Promise<Map<string, { category: TargetCategory; type: string | null }>> {
  const categoryGuide = TARGET_CATEGORIES.map((c) => `- ${c}: ${CATEGORY_DESCRIPTIONS[c]}`).join("\n");
  const prompt = `
You classify marketplace services into one parent category and one specific service type.
Return JSON array only.

Allowed parent categories:
${categoryGuide}

Rules:
- Pick exactly one parent category from the allowed list.
- Keep type specific and human-readable (examples: Plumber, Lawyer, Photographer, Dentist).
- If current type is already specific, keep it unless clearly wrong.
- If current type is empty and currentCategory is a specific profession, use currentCategory as type.
- Never return empty id.
- Never output text outside JSON.

Output schema:
[
  { "id": "string", "category": "AllowedCategory", "type": "string | null" }
]
  `.trim();

  const userPayload = JSON.stringify(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description.slice(0, 800),
      currentCategory: item.serviceCategory,
      currentType: item.type,
      city: item.city,
      price: item.price,
    })),
  );

  const raw = await callClassifierLlm([
    { role: "system", content: prompt },
    { role: "user", content: userPayload },
  ]);
  const parsed = parseClassifierOutput(raw);
  const map = new Map<string, { category: TargetCategory; type: string | null }>();
  for (const row of parsed) map.set(row.id, { category: row.category, type: row.type });
  return map;
}

function isPlausibleTarget(legacyCategory: string, suggestedCategory: TargetCategory): boolean {
  const allowed = LEGACY_TO_PLAUSIBLE_TARGETS[legacyCategory];
  if (!allowed) return true;
  return allowed.includes(suggestedCategory);
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ServiceRow = {
  id: string;
  title: string;
  description: string;
  serviceCategory: string;
  type: string | null;
  city: string | null;
  price: number | null;
};

async function fetchServicesBatch(offset: number, take: number): Promise<ServiceRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      description: string;
      serviceCategory: string;
      type: string | null;
      city: string | null;
      price: number | null;
    }>
  >`
    SELECT id, title, description, "serviceCategory", type, city, price
    FROM "Service"
    ORDER BY "createdAt" ASC, id ASC
    LIMIT ${take} OFFSET ${offset}
  `;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    serviceCategory: String(r.serviceCategory ?? ""),
    type: r.type != null ? String(r.type) : null,
    city: r.city != null ? String(r.city) : null,
    price: r.price != null ? Number(r.price) : null,
  }));
}

async function main() {
  const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 10);
  const LLM_SUB_BATCH = Number(process.env.LLM_SUB_BATCH ?? 10);
  const DRY_RUN = process.env.DRY_RUN !== "false";
  const FORCE = process.env.FORCE_RECLASSIFY === "true";
  const DELAY_MS = Number(process.env.LLM_DELAY_MS ?? 400);

  let offset = 0;
  let scanned = 0;
  let updated = 0;

  while (true) {
    const services = await fetchServicesBatch(offset, BATCH_SIZE);

    if (services.length === 0) break;
    offset += services.length;
    scanned += services.length;

    for (let i = 0; i < services.length; i += LLM_SUB_BATCH) {
      const slice = services.slice(i, i + LLM_SUB_BATCH);
      let llmMap = new Map<string, { category: TargetCategory; type: string | null }>();

      try {
        llmMap = await classifyBatchWithLlm(
          slice.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            serviceCategory: s.serviceCategory,
            type: s.type ?? null,
            city: s.city ?? null,
            price: s.price ?? null,
          })),
        );
        if (DELAY_MS > 0) await sleepMs(DELAY_MS);
      } catch (error) {
        console.error("[service-category-reclassify] LLM batch failed, fallback only", error);
      }

      for (const service of slice) {
        const fallbackCategory = fallbackCategoryFromText(
          `${service.title} ${service.description} ${service.type ?? ""} ${service.serviceCategory}`,
        );
        const fallbackType = defaultTypeFromCurrent(service.serviceCategory, service.type ?? null);

        let nextCategory: TargetCategory = fallbackCategory;
        let nextType: string | null = fallbackType;
        const llm = llmMap.get(service.id);
        if (llm) {
          if (isPlausibleTarget(service.serviceCategory, llm.category)) {
            nextCategory = llm.category;
            if (safeType(llm.type) != null) nextType = safeType(llm.type);
          }
        }

        const categoryChanged = service.serviceCategory !== nextCategory;
        const typeChanged = (service.type ?? null) !== (nextType ?? null);

        if (!FORCE && !categoryChanged && !typeChanged) continue;

        if (DRY_RUN) {
          console.log(
            `[DRY_RUN] ${service.id} | category: ${service.serviceCategory} -> ${nextCategory} | type: ${service.type ?? "null"} -> ${nextType ?? "null"}`,
          );
          updated += 1;
          continue;
        }

        await prisma.service.update({
          where: { id: service.id },
          data: {
            serviceCategory: nextCategory,
            type: nextType,
          },
        });
        updated += 1;
      }
    }

    console.log(`[service-category-reclassify] scanned=${scanned} updated=${updated}`);
  }

  console.log(
    `[service-category-reclassify] done scanned=${scanned} updated=${updated} dryRun=${DRY_RUN}`,
  );
}

main()
  .catch((err) => {
    console.error("Error while reclassifying service categories:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
