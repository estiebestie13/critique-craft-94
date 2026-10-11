import { defineMcp } from "@lovable.dev/mcp-js";
import reviewProject from "./tools/review-project";

export default defineMcp({
  name: "critique-craft",
  title: "Critique Craft",
  version: "0.1.0",
  instructions:
    "Work Review critiques project descriptions for early-career professionals. Call `review_project` with the goal, audience, and what was delivered. Use generic descriptions, no names or confidential figures.",
  tools: [reviewProject],
});
