export type ReviewInput = {
  goal: string;
  audience: string;
  delivered: string;
  measured: string;
  differently: string;
};

export type Critique = {
  clarity: { score: number; explanation: string };
  impact: { verdict: string; quote: string };
  audienceFit: { verdict: string; phraseToChange: string; suggestion: string };
  evidenceGaps: string[];
  reviewerQuestions: string[];
  rewrite: string;
};

const PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.]+/g, // emails
  /\+?\d[\d\s().-]{8,}\d/g, // phone numbers
  /(?:[$€£¥]\s?\d[\d,.]*\s?(?:[kmb]|million|billion|thousand)?|\b\d[\d,.]*\s?(?:USD|EUR|GBP|dollars|euros)\b)/gi, // currency
  /\b(?:Mr|Ms|Mrs|Dr)\.?\s+[A-Z][a-z]+/g, // titled names
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g, // capitalized pairs (names, companies)
  /\b[A-Z][\w&]*\s+(?:Inc|LLC|Ltd|Corp|Corporation|Group|Bank|Labs)\b\.?/g, // companies
  /\b[a-z]+[A-Z]\w*\b/g, // camelCase systems
  /\b[A-Z][a-z]+[A-Z]\w*\b/g, // PascalCase systems
  /\b[A-Z]{2,}[-_]?\d+\b/g, // codes like JIRA-12
  /\b[\w-]+\.(?:internal|corp|local)\b/gi, // internal hosts
];
const SAFE = new Set(["VP", "Sales", "Head Of", "Product Manager", "Machine Learning", "Customer Support", "Sales Team"]);

export function detectSensitive(input: ReviewInput): string[] {
  const text = Object.values(input).join("\n");
  const hits = new Set<string>();
  for (const re of PATTERNS) for (const m of text.matchAll(re)) {
    const w = m[0].trim();
    if (!SAFE.has(w)) hits.add(w);
  }
  return [...hits].slice(0, 10);
}

export function critiqueToText(c: Critique): string {
  const list = (a: string[]) => (a.length ? a.map((x) => `- ${x}`).join("\n") : "Nothing to flag");
  return [
    "Clarity score",
    `${c.clarity.score}/5. ${c.clarity.explanation}`,
    "",
    "Impact check",
    c.impact.verdict,
    c.impact.quote ? `Quoted: "${c.impact.quote}"` : "",
    "",
    "Audience fit",
    c.audienceFit.verdict,
    c.audienceFit.phraseToChange ? `Change "${c.audienceFit.phraseToChange}": ${c.audienceFit.suggestion}` : "",
    "",
    "Evidence gaps",
    list(c.evidenceGaps),
    "",
    "Likely reviewer questions",
    list(c.reviewerQuestions),
    "",
    "Suggested rewrite",
    c.rewrite,
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
