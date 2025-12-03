import { NextResponse } from "next/server";
import { embedText } from "@/lib/embedding";
import { hybridSearchJobs } from "@/lib/jobsStore";
import type { ScoredJob } from "@/types/job";

const SYSTEM_PROMPT = `
# Role and Purpose

Vous êtes un assistant IA pour une plateforme de matching professionnel avec des profils d'employés.

Votre rôle est de synthétiser une réponse cohérente et précise basée sur la question de l'utilisateur et le contexte des profils d'employés.

# Guidelines:

1. Formulez des réponses en français professionnel

2. Analysez les données de profil :

- Titres de poste (ex: "Social Media Manager")

- Descriptions de poste (ex: "🐌 Nous recherchons un Chargé de Marketing Digital passionné et dynamique pour rejoindre notre équipe...")

3. Structurez les réponses avec :

a) Nombre de poste pertinents

b) Répartition par compétences/localisation

c) Suggestions de combinaisons intéressantes

4. Mentionnez explicitement les données manquantes si nécessaire

5. Utilisez des exemples concrets tirés des descriptions

6. Gardez un ton formel mais accessible

Exemple de réponse idéale :

"Parmi les postes dispo, nous avons identifié 3 postes en marketing digital :

- 2 basés à Casablanca avec salaires entre 6000-6500dhs/jour

- 1 avec expérience en stratégie de contenu

Le poste ID#127 mentionne une expertise certifiée en Google Ads"

Review the question from the user:
`.trim();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface SynthResponseBody {
  query?: string;
  topK?: number;
}

interface SynthLlmResponse {
  response: string;
  referencedJobIds?: string[];
}

function truncate(text: string, max = 480): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function buildJobsContext(jobs: ScoredJob[]): string {
  if (!jobs.length) {
    return "Aucun job pertinent n'a été trouvé pour cette requête.";
  }
  return jobs
    .map((job, idx) => {
      const lines = [
        `Job ${idx + 1} - ID ${job.id}`,
        `Titre: ${job.title || "Titre indisponible"}`,
        `Entreprise: ${job.company || "Entreprise non renseignée"}`,
        `Localisation: ${job.location ?? "Non précisée"}`,
        `Compétences / Tags: ${(job.tags ?? []).join(", ") || "Aucun tag"}`,
        `Description: ${truncate(job.description ?? "")}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}

async function callOpenRouter(
  query: string,
  jobs: ScoredJob[],
): Promise<SynthLlmResponse> {
  const apiKey =
    process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY / NEXT_PUBLIC_OPENROUTER_API_KEY is not configured.",
    );
  }

  const userPrompt = `
Question utilisateur :
"""${query}"""

Profils disponibles :
${buildJobsContext(jobs)}

Répondez en JSON avec la forme suivante :
{
  "response": "texte complet en français professionnel",
  "referencedJobIds": ["jobId1", "jobId2"]
}
`.trim();

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_REFERRER || "http://localhost",
      "X-Title": "SerrbiSynthesizedJobs",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: "tngtech/deepseek-r1t2-chimera:free",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter error ${response.status}${
        details ? `: ${details.slice(0, 200)}` : ""
      }`,
    );
  }

  const data = (await response.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenRouter returned an invalid payload.");
  }

  let parsed: SynthLlmResponse;
  try {
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    const jsonSlice =
      firstBrace !== -1 && lastBrace !== -1
        ? content.slice(firstBrace, lastBrace + 1)
        : content;
    parsed = JSON.parse(jsonSlice);
  } catch (err) {
    throw new Error("Impossible de parser la réponse de l'IA.");
  }

  if (!parsed || typeof parsed.response !== "string") {
    throw new Error("La réponse de l'IA est incomplète.");
  }

  return {
    response: parsed.response.trim(),
    referencedJobIds: Array.isArray(parsed.referencedJobIds)
      ? parsed.referencedJobIds.map((id) => String(id))
      : [],
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | SynthResponseBody
      | null;

    const query = body?.query?.trim();
    if (!query) {
      return NextResponse.json(
        { error: "La requête doit contenir un champ 'query' non vide." },
        { status: 400 },
      );
    }

    const topK =
      typeof body?.topK === "number" && body.topK > 0 ? body.topK : 5;

    const queryEmbedding = await embedText(query);
    const jobs = await hybridSearchJobs(query, queryEmbedding, {
      topKDense: 25,
      topKFinal: Math.max(topK, 5),
    });

    const topJobs = jobs.slice(0, topK);
    const llm = await callOpenRouter(query, topJobs);

    const referencedJobs = (llm.referencedJobIds ?? []).map((id) =>
      topJobs.find((job) => job.id === id),
    );

    return NextResponse.json(
      {
        responseText: llm.response,
        jobsUsed: referencedJobs
          .filter(Boolean)
          .map((job) => ({
            id: job!.id,
            title: job!.title,
            company: job!.company,
            location: job!.location ?? null,
          })),
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json(
      { error: "Impossible de générer la synthèse.", details: message },
      { status: 500 },
    );
  }
}

