import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/start-server-core";
import { z } from "zod";

const schema = z.object({
  goal: z.string().trim().min(1).max(2000),
  audience: z.string().trim().min(1).max(500),
  delivered: z.string().trim().min(1).max(3000),
  measured: z.string().trim().max(2000),
  differently: z.string().trim().max(2000),
});

// Abuse protection: the site is public, so cap how many AI reviews can run.
// Per visitor: 5 reviews per hour. Across all visitors: 30 reviews per day.
const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_LIMIT = 30;
const GLOBAL_WINDOW_MS = 24 * 60 * 60 * 1000;

const ipHits = new Map<string, number[]>();
let globalHits: number[] = [];

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

function checkLimits(ip: string): string | null {
  const now = Date.now();
  globalHits = prune(globalHits, GLOBAL_WINDOW_MS, now);
  if (globalHits.length >= GLOBAL_LIMIT) {
    return "The daily review limit for this site has been reached. Please try again tomorrow.";
  }
  const hits = prune(ipHits.get(ip) ?? [], PER_IP_WINDOW_MS, now);
  if (hits.length >= PER_IP_LIMIT) {
    return "You have reached the limit of 5 reviews per hour. Please try again later.";
  }
  hits.push(now);
  ipHits.set(ip, hits);
  globalHits.push(now);
  return null;
}

export const reviewProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const ip = getRequestIP() ?? "unknown";
    const limited = checkLimits(ip);
    if (limited) return { ok: false as const, error: limited };
    const { runReview } = await import("./review.server");
    try {
      return { ok: true as const, critique: await runReview(data) };
    } catch (e: unknown) {
      const err = e as { statusCode?: number; message?: string };
      const s = err.statusCode;
      const msg =
        s === 429
          ? "Too many requests right now. Please wait a moment and try again."
          : s === 402
            ? "AI credits are used up for this workspace."
            : err.message || "Something went wrong.";
      return { ok: false as const, error: msg };
    }
  });
