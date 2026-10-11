import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "review_project",
  title: "Review project description",
  description:
    "Get a direct, structured critique (clarity, impact, audience fit, evidence gaps, reviewer questions, rewrite) of a project description. Nothing is stored.",
  inputSchema: {
    goal: z.string().trim().min(1).max(2000).describe("What problem the project tried to solve."),
    audience: z.string().trim().min(1).max(500).describe("Who will read it, as a role (e.g. VP of Sales)."),
    delivered: z.string().trim().min(1).max(3000).describe("What was built or delivered."),
    measured: z.string().trim().max(2000).optional().describe("How success was measured."),
    differently: z.string().trim().max(2000).optional().describe("What would be done differently."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async (input) => {
    const { runReview } = await import("../../review.server");
    const { critiqueToText } = await import("../../review-types");
    try {
      const c = await runReview({ ...input, measured: input.measured ?? "", differently: input.differently ?? "" });
      return {
        content: [{ type: "text", text: critiqueToText(c) }],
        structuredContent: {
          clarity: { score: c.clarity.score, explanation: c.clarity.explanation },
          impact: { verdict: c.impact.verdict, quote: c.impact.quote },
          audienceFit: { ...c.audienceFit },
          evidenceGaps: [...c.evidenceGaps],
          reviewerQuestions: [...c.reviewerQuestions],
          rewrite: c.rewrite,
        },
      };
    } catch (e) {
      const s = (e as { statusCode?: number }).statusCode;
      throw new ToolError(
        s === 429 ? "Too many requests. Try again shortly." : s === 402 ? "AI credits are used up." : "The review failed. Please try again.",
      );
    }
  },
});
