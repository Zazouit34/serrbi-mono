export type ResumeScore = {
    score: number; // 0-100
    breakdown: { category: string; score: number; max: number; missing?: string[] }[];
    suggestions: string[];
  };
  
  const re = {
    email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    phone: /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/,
    year: /\b(19|20)\d{2}\b/,
    monthYear: /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(19|20)\d{2}\b/i,
    link: /(https?:\/\/|linkedin\.com|github\.com|portfolio|behance|dribbble)/i,
    bullets: /(^[\-\*\u2022]\s+)|(\u2022)/m,
  };
  
  const has = (text: string, pattern: RegExp) => pattern.test(text);
  const includesAny = (text: string, keys: string[]) =>
    keys.some((k) => text.toLowerCase().includes(k));
  
  const sectionKeys = {
    experience: ["experience", "employment", "work history", "professional experience"],
    education: ["education", "degree", "university", "bachelor", "master", "phd"],
    skills: ["skills", "technologies", "tech stack", "competencies"],
    summary: ["summary", "objective", "profile", "about"],
    projects: ["projects", "personal projects", "selected projects"],
    certs: ["certifications", "licenses", "certification", "license"],
  };
  
  const actionVerbs = [
    "led","managed","built","created","developed","designed","implemented","launched","optimized","improved",
    "architected","delivered","owned","migrated","refactored","automated","reduced","increased","analyzed","collaborated",
    "mentored","deployed","tested","debugged","integrated","secured","configured","planned","researched","presented",
  ];
  
  function scorePresence(present: boolean, max: number) { return present ? max : 0; }
  
  function scoreVerbs(text: string, max: number) {
    const count = actionVerbs.filter((v) => new RegExp(`\\b${v}\\b`, "i").test(text)).length;
    const ratio = Math.min(1, count / 10); // 10 distinct verbs -> full score
    return Math.round(max * ratio);
  }
  
  function scoreLength(words: number, max: number) {
    // Full score between 300–900 words; soft falloff outside
    if (words >= 300 && words <= 900) return max;
    if (words < 150) return Math.round(max * 0.2);
    if (words < 300) return Math.round(max * 0.6);
    if (words > 1500) return Math.round(max * 0.2);
    if (words > 900) return Math.round(max * 0.6);
    return max;
  }
  
  export function scoreResume(textInput: string): ResumeScore {
    const text = textInput || "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;
  
    const presence = {
      email: has(text, re.email),
      phone: has(text, re.phone),
      experience: includesAny(text, sectionKeys.experience),
      education: includesAny(text, sectionKeys.education),
      skills: includesAny(text, sectionKeys.skills),
      summary: includesAny(text, sectionKeys.summary),
      projects: includesAny(text, sectionKeys.projects),
      certs: includesAny(text, sectionKeys.certs),
      links: has(text, re.link),
      dates: has(text, re.monthYear) || has(text, re.year),
      bullets: has(text, re.bullets),
    };
  
    const weights = {
      contact: 15,          // email + phone
      experience: 20,
      education: 10,
      skills: 10,
      summary: 7,
      projectsCerts: 8,     // split across both
      links: 5,
      dates: 5,
      bullets: 5,
      verbs: 5,
      length: 10,
    };
  
    const breakdown: ResumeScore["breakdown"] = [
      {
        category: "Contact",
        score: Math.round(
          (presence.email ? 8 : 0) + (presence.phone ? 7 : 0)
        ),
        max: weights.contact,
        missing: [
          ...(presence.email ? [] : ["Professional email"]),
          ...(presence.phone ? [] : ["Phone number"]),
        ],
      },
      {
        category: "Experience",
        score: scorePresence(presence.experience, weights.experience),
        max: weights.experience,
        missing: presence.experience ? [] : ["Experience section"],
      },
      {
        category: "Education",
        score: scorePresence(presence.education, weights.education),
        max: weights.education,
        missing: presence.education ? [] : ["Education section"],
      },
      {
        category: "Skills",
        score: scorePresence(presence.skills, weights.skills),
        max: weights.skills,
        missing: presence.skills ? [] : ["Skills section (with keywords)"],
      },
      {
        category: "Summary",
        score: scorePresence(presence.summary, weights.summary),
        max: weights.summary,
        missing: presence.summary ? [] : ["Professional summary/objective"],
      },
      {
        category: "Projects/Certifications",
        score:
          (presence.projects ? 4 : 0) +
          (presence.certs ? 4 : 0),
        max: weights.projectsCerts,
        missing: [
          ...(presence.projects ? [] : ["Projects (impact-focused)"]),
          ...(presence.certs ? [] : ["Certifications (if relevant)"]),
        ],
      },
      {
        category: "Links",
        score: scorePresence(presence.links, weights.links),
        max: weights.links,
        missing: presence.links ? [] : ["Links (LinkedIn/GitHub/Portfolio)"],
      },
      {
        category: "Dates",
        score: scorePresence(presence.dates, weights.dates),
        max: weights.dates,
        missing: presence.dates ? [] : ["Dates for roles/education"],
      },
      {
        category: "Bullets",
        score: scorePresence(presence.bullets, weights.bullets),
        max: weights.bullets,
        missing: presence.bullets ? [] : ["Use concise bullet points"],
      },
      {
        category: "Action Verbs",
        score: scoreVerbs(text, weights.verbs),
        max: weights.verbs,
        missing: [],
      },
      {
        category: "Length",
        score: scoreLength(words, weights.length),
        max: weights.length,
        missing: [],
      },
    ];
  
    const score = Math.min(
      100,
      Math.max(
        0,
        breakdown.reduce((sum, b) => sum + b.score, 0)
      )
    );
  
    const suggestions = Array.from(
        new Set(
          breakdown
            .flatMap((b) => b.missing || [])
            .filter(Boolean)
        )
      );
    
      return {
        score: Math.round(score),
        breakdown,
        suggestions,
      };
  }