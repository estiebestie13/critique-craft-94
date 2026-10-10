import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  goal: z.string().trim().min(1).max(2000),
  audience: z.string().trim().min(1).max(500),
  delivered: z.string().trim().min(1).max(3000),
  measured: z.string().trim().max(2000),
  differently: z.string().trim().max(2000),
});

export const reviewProject = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
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
