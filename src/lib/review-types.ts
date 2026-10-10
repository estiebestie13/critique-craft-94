export type ReviewInput = {
  goal: string;
  audience: string;
  delivered: string;
  measured: string;
  differently: string;
};

export type Critique = {
  sensitive: boolean;
  sensitiveItems: string[];
  clarity: { score: number; verdict: string; notes: string[] };
  impact: { rating: string; verdict: string; notes: string[] };
  audienceFit: { rating: string; verdict: string; notes: string[] };
  evidenceGaps: { claim: string; missing: string }[];
  blindSpots: string[];
  rewrite: string;
};

const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, "email address"],
  [/\+?\d[\d\s().-]{8,}\d/g, "phone number"],
  [/\b(?:Mr|Ms|Mrs|Dr)\.?\s+[A-Z][a-z]+/g, "person's name"],
  [/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, "possible name"],
  [/\b[a-z]+[A-Z]\w*\b/g, "possible internal system name"],
  [/\b[A-Z]{2,}[-_]?\d+\b/g, "possible internal code or ID"],
  [/\b[\w-]+\.(?:internal|corp|local)\b/gi, "internal hostname"],
  [/\bcustomer\s+(?:id|name|account)\b[^.\n]*/gi, "customer data"],
];
const SAFE = new Set(["Project Goal", "Machine Learning", "Product Manager", "Sales Team"]);

export function detectSensitive(input: ReviewInput): string[] {
  const text = Object.values(input).join("\n");
  const hits = new Set<string>();
  for (const [re, label] of PATTERNS) {
    for (const m of text.matchAll(re)) {
      if (!SAFE.has(m[0])) hits.add(`${m[0].trim()} (${label})`);
    }
  }
  return [...hits].slice(0, 8);
}

export function critiqueToText(c: Critique): string {
  const list = (a: string[]) => a.map((x) => `- ${x}`).join("\n");
  return [
    `WORK REVIEW`,
    ``,
    `Clarity: ${c.clarity.score}/10`,
    c.clarity.verdict,
    list(c.clarity.notes),
    ``,
    `Impact: ${c.impact.rating}`,
    c.impact.verdict,
    list(c.impact.notes),
    ``,
    `Audience fit: ${c.audienceFit.rating}`,
    c.audienceFit.verdict,
    list(c.audienceFit.notes),
    ``,
    `Evidence gaps:`,
    list(c.evidenceGaps.map((g) => `${g.claim}: ${g.missing}`)),
    ``,
    `Blind spots:`,
    list(c.blindSpots),
    ``,
    `Suggested rewrite:`,
    c.rewrite,
  ].join("\n");
}
