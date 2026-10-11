# Critique Craft

Build a web app called “Work Review” that helps early-career professionals critique their own project descriptions before sharing them with a manager or team.

Core flow:

The user fills in a short form: project goal, who the audience is, what they built or delivered, how success was measured, and what they’d do differently.

The user clicks “Review my project.” The app returns a structured critique.

The critique includes:

Clarity score: Is the goal and outcome easy to understand in two sentences?

Impact check: Does the description connect the work to a result, not just a task?

Audience fit: Is the language suited to the stated audience, such as an executive versus a technical peer?

Evidence gaps: What claims lack a metric, example, or source?

Blind spots: Two to three questions a skeptical reviewer would likely ask.

Suggested rewrite: A tighter version of the description, using only the facts the user provided.

Rules:

Use only the information the user enters. Never invent metrics, tools, or outcomes.

Include a notice at the top of the form: “Do not enter confidential company information, personal data, or employee names. Use generic descriptions only.”

If the form includes names, customer data, or internal system names, show a warning and ask the user to generalize before continuing.

Do not use em dashes anywhere in the output.

Keep feedback direct and specific, with no generic praise.

UI: Single-page layout with the form on the left and the critique on the right on desktop, stacked on mobile. Show a loading state during analysis. Include a “Copy critique” button.

Data: No login. Nothing is saved between sessions.

Use an AI model for the critique step. Include a system prompt that enforces the rules above and returns results in a consistent structure.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://critique-craft-94.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b18e978e-ab79-43fe-ba34-3d1d3467d864).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
