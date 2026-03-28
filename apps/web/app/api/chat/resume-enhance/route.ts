import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

type RequestBody = {
  resumeText: string;
  userRequest: string;
  locale?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function pickFirstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

function extractAssistantText(json: any): string | null {
  return pickFirstString(
    json?.output?.choices?.[0]?.message?.content,
    json?.output?.text,
    json?.output?.texts?.[0],
    json?.output?.choices?.[0]?.text,
    json?.choices?.[0]?.message?.content,
    json?.choices?.[0]?.text,
  );
}

async function callDashScope(body: {
  model: string;
  messages: Array<{ role: string; content: string }>;
}): Promise<string> {
  const url = getRequiredEnv("CHAT_API_URL");
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  const model = "qwen3-32b";

  const dashscopeBody = {
    model,
    input: { messages: body.messages },
    parameters: {
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2000,
      result_format: "message",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(dashscopeBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`DashScope API error: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const text = extractAssistantText(json);
  if (!text) {
    throw new Error("DashScope returned no valid text");
  }
  return text;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { resumeText, userRequest, locale = "en" } = body;

    if (!resumeText || !userRequest) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build prompt for resume enhancement
    const systemPrompt = locale === "fr"
      ? `Tu es un expert en rédaction de CV professionnel. Ton rôle est d'aider les utilisateurs à améliorer leur CV en fournissant des suggestions concrètes et actionnables.

Règles:
- Fournis des suggestions spécifiques et détaillées
- Utilise des exemples concrets
- Adapte tes suggestions au contexte du CV fourni
- Sois constructif et encourageant
- Fournis des phrases prêtes à l'emploi que l'utilisateur peut copier-coller
- Format tes réponses en markdown pour une meilleure lisibilité`
      : locale === "ar"
        ? `أنت خبير في كتابة السير الذاتية المهنية. دورك هو مساعدة المستخدمين على تحسين سيرهم الذاتية من خلال تقديم اقتراحات ملموسة وقابلة للتنفيذ.

القواعد:
- قدم اقتراحات محددة ومفصلة
- استخدم أمثلة ملموسة
- كيّف اقتراحاتك مع سياق السيرة الذاتية المقدمة
- كن بناءً ومشجعاً
- قدم جملاً جاهزة للاستخدام يمكن للمستخدم نسخها ولصقها
- قم بتنسيق إجاباتك بصيغة markdown لتحسين القراءة`
        : `You are a professional resume writing expert. Your role is to help users improve their resumes by providing concrete and actionable suggestions.

Rules:
- Provide specific and detailed suggestions
- Use concrete examples
- Adapt your suggestions to the context of the provided resume
- Be constructive and encouraging
- Provide ready-to-use phrases that users can copy-paste
- Format your responses in markdown for better readability`;

    const userPrompt = locale === "fr"
      ? `Voici le CV actuel de l'utilisateur:

${resumeText}

L'utilisateur demande: "${userRequest}"

Fournis des suggestions concrètes et détaillées pour améliorer le CV selon cette demande. Inclus des exemples de phrases prêtes à l'emploi.`
      : locale === "ar"
        ? `إليك السيرة الذاتية الحالية للمستخدم:

${resumeText}

يطلب المستخدم: "${userRequest}"

قدم اقتراحات ملموسة ومفصلة لتحسين السيرة الذاتية وفقاً لهذا الطلب. قم بتضمين أمثلة على جمل جاهزة للاستخدام.`
        : `Here is the user's current resume:

${resumeText}

The user requests: "${userRequest}"

Provide concrete and detailed suggestions to improve the resume according to this request. Include examples of ready-to-use phrases.`;

    const suggestions = await callDashScope({
      model: "qwen3-32b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Resume enhancement error:", error);
    return NextResponse.json(
      { error: "Failed to generate resume enhancement suggestions" },
      { status: 500 }
    );
  }
}
