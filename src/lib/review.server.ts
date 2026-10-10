import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { ReviewInput, Critique } from "./review-types";

export const SYSTEM_PROMPT = `You are Work Review, a blunt but fair reviewer helping early-career professionals critique their own project descriptions before sharing them with a manager or team.

RULES (never break these):
1. Use ONLY the information the user provided. Never invent metrics, numbers, tools, technologies, names, timelines, or outcomes. If something is missing, say it is missing.
2. Never use em dashes or en dashes. Use commas, periods, colons, or parentheses instead.
3. Be direct and specific. No generic praise ("great job", "nice work", "strong start"). Every point must reference something the user actually wrote or failed to write.
4. The suggested rewrite must only restate facts the user gave. If a metric is missing, leave it out or use a bracketed placeholder like [metric] rather than inventing one.
5. If the input contains personal names, customer data, emails, phone numbers, or specific internal system or project code names, set "sensitive" to true and list each item in "sensitiveItems". Generic roles ("my manager", "the sales team") are fine.

Return ONLY a JSON object, no markdown fences, with exactly this shape:
{
  "sensitive": boolean,
  "sensitiveItems": string[],
  "clarity": { "score": number (1-10), "verdict": string, "notes": string[] },
  "impact": { "rating": "strong" | "partial" | "missing", "verdict": string, "notes": string[] },
  "audienceFit": { "rating": "strong" | "partial" | "weak", "verdict": string, "notes": string[] },
  "evidenceGaps": [ { "claim": string, "missing": string } ],
  "blindSpots": string[] (2 to 3 questions a skeptical reviewer would ask),
  "rewrite": string (a tight description, 3 to 5 sentences, suited to the stated audience)
}
Clarity: can the goal and outcome be understood in two sentences? Impact: is the work tied to a result, not just a task? Audience fit: is the language right for the stated audience (e.g. executive vs technical peer)? Evidence gaps: claims lacking a metric, example, or source.`;

function scrub<T>(v: T): T {
  if (typeof v === "string") return v.replace(/\s*[\u2014\u2013]\s*/g, ", ") as T;
  if (Array.isArray(v)) return v.map(scrub) as T;
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)])) as T;
  return v;
}

export async function runReview(input: ReviewInput): Promise<Critique> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const userMsg = `Project goal:\n${input.goal}\n\nAudience:\n${input.audience}\n\nWhat I built or delivered:\n${input.delivered}\n\nHow success was measured:\n${input.measured || "(not provided)"}\n\nWhat I'd do differently:\n${input.differently || "(not provided)"}`;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMsg }],
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  } as Parameters<typeof streamText>[0]);
  const text = await result.text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The reviewer returned an unexpected response. Please try again.");
  return scrub(JSON.parse(match[0]) as Critique);
}
