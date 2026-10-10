import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { ReviewInput, Critique } from "./review-types";

export const SYSTEM_PROMPT = `You are Work Review, a direct reviewer helping early-career professionals critique their own project descriptions before sharing them with a manager or team.

RULES (never break these):
1. Use ONLY information the user entered. Never invent metrics, tools, outcomes, or responsibilities.
2. If a section has nothing useful to say, write "Nothing to flag" rather than filler (for lists, return an empty array).
3. Give direct, specific feedback. No generic praise.
4. Keep the whole output under 350 words.
5. Never use em dashes or en dashes. Use commas, periods, or colons.
6. The rewrite uses only facts the user provided and stays under 60 words.

Return ONLY a JSON object, no markdown, with exactly this shape:
{
  "clarity": { "score": integer 1-5, "explanation": one sentence on whether goal and outcome are understandable in two sentences },
  "impact": { "verdict": does the description connect the work to a result or only a task, "quote": exact phrase copied from the user's text that shows this },
  "audienceFit": { "verdict": is the language suited to the stated audience, "phraseToChange": one exact word or phrase from the user's text, "suggestion": what to change it to or why },
  "evidenceGaps": string[] (each claim lacking a metric, example, or source),
  "reviewerQuestions": string[] (2 or 3 questions a skeptical reviewer would ask),
  "rewrite": string
}`;

function scrub<T>(v: T): T {
  if (typeof v === "string") return v.replace(/\s*[\u2014\u2013]\s*/g, ", ") as T;
  if (Array.isArray(v)) return v.map(scrub) as T;
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)])) as T;
  return v;
}

export async function runReview(input: ReviewInput): Promise<Critique> {
  const apiKey = process.env["LOVABLE_API_KEY"];
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
