import { readFile } from "node:fs/promises";
import { prisma } from "./client";

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSkills(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\|;]+/g)
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i]!;
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function getStartAndEndDate(
  todayOnly: boolean,
  targetDate: string | undefined,
): { gte?: Date; lt?: Date } | undefined {
  if (targetDate && targetDate.trim()) {
    const raw = targetDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new Error(`Invalid TARGET_DATE format: ${raw}. Use YYYY-MM-DD.`);
    }
    const start = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      throw new Error(`Invalid TARGET_DATE value: ${raw}`);
    }
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { gte: start, lt: end };
  }

  if (!todayOnly) return undefined;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { gte: start };
}

async function main() {
  const csvPath =
    process.env.CSV_PATH || "/Users/zazouit/Downloads/jobs_final_ready_test.csv";
  const dryRun = parseBooleanEnv(process.env.DRY_RUN, true);
  const todayOnly = parseBooleanEnv(process.env.TODAY_ONLY, true);
  const targetDate = process.env.TARGET_DATE;
  const maxUpdates = Number(process.env.MAX_UPDATES || "0");

  const csvRaw = await readFile(csvPath, "utf8");
  const parsed = parseCsv(csvRaw);
  if (parsed.length < 2) {
    throw new Error(`CSV appears empty or invalid: ${csvPath}`);
  }

  const header = parsed[0]!.map((h) => h.trim().toLowerCase());
  const titleIdx = header.indexOf("title");
  const skillsIdx = header.indexOf("skills");
  const tagsIdx = header.indexOf("tags");

  if (titleIdx === -1) {
    throw new Error("CSV must include a 'title' column.");
  }
  if (skillsIdx === -1 && tagsIdx === -1) {
    throw new Error("CSV must include a 'skills' or 'tags' column.");
  }

  const csvSkillsByTitle = new Map<string, Set<string>>();

  for (let r = 1; r < parsed.length; r += 1) {
    const row = parsed[r]!;
    const title = (row[titleIdx] ?? "").trim();
    const sourceSkills = (row[skillsIdx] ?? row[tagsIdx] ?? "").trim();
    if (!title || !sourceSkills) continue;

    const normalized = normalizeTitle(title);
    const parsedSkills = parseSkills(sourceSkills);
    if (!parsedSkills.length) continue;

    const existing = csvSkillsByTitle.get(normalized) ?? new Set<string>();
    for (const skill of parsedSkills) existing.add(skill);
    csvSkillsByTitle.set(normalized, existing);
  }

  const createdAtFilter = getStartAndEndDate(todayOnly, targetDate);
  const whereClause: any = {
    tags: { isEmpty: true },
  };
  if (createdAtFilter) {
    whereClause.createdAt = createdAtFilter;
  }

  const missingTagJobs = await prisma.job.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      createdAt: true,
      tags: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let matched = 0;
  let updated = 0;
  let skippedNoCsvMatch = 0;
  const previews: string[] = [];

  for (const job of missingTagJobs) {
    const normalized = normalizeTitle(job.title);
    const tagsSet = csvSkillsByTitle.get(normalized);
    if (!tagsSet || tagsSet.size === 0) {
      skippedNoCsvMatch += 1;
      continue;
    }

    const tags = Array.from(tagsSet);
    matched += 1;

    previews.push(
      `${job.id} | ${job.title} | tags=[${tags.join(", ")}] | createdAt=${job.createdAt.toISOString()}`,
    );

    if (dryRun) continue;
    if (maxUpdates > 0 && updated >= maxUpdates) break;

    await prisma.job.update({
      where: { id: job.id },
      data: { tags },
    });
    updated += 1;
  }

  console.log(`CSV path: ${csvPath}`);
  console.log(`Mode: ${dryRun ? "DRY_RUN" : "WRITE"}`);
  console.log(`todayOnly: ${todayOnly}`);
  if (targetDate) {
    console.log(`targetDate: ${targetDate}`);
  }
  console.log(`Candidate jobs with empty tags: ${missingTagJobs.length}`);
  console.log(`Matched by title in CSV: ${matched}`);
  console.log(`No CSV title match: ${skippedNoCsvMatch}`);
  if (!dryRun) {
    console.log(`Updated jobs: ${updated}`);
  }

  if (previews.length > 0) {
    console.log("Preview (first 20):");
    for (const line of previews.slice(0, 20)) {
      console.log(`- ${line}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("Failed to repair missing job tags from CSV:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
