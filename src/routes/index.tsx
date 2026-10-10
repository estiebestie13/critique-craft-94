import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Copy, Check, Loader2, ShieldAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reviewProject } from "@/lib/review.functions";
import { detectSensitive, critiqueToText, type Critique, type ReviewInput } from "@/lib/review-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Work Review | Critique your project description" },
      { name: "description", content: "Get a direct, structured critique of your project write-up before you share it with your manager or team." },
      { property: "og:title", content: "Work Review" },
      { property: "og:description", content: "A direct, structured critique of your project description before you share it." },
    ],
  }),
  component: Index,
});

const FIELDS: { key: keyof ReviewInput; label: string; hint: string; area: boolean; required: boolean }[] = [
  { key: "goal", label: "Project goal", hint: "What problem were you trying to solve?", area: true, required: true },
  { key: "audience", label: "Audience", hint: "Use a role, not a name. Example: VP of Sales, engineering peers.", area: false, required: true },
  { key: "delivered", label: "What you built or delivered", hint: "The concrete output of your work.", area: true, required: true },
  { key: "measured", label: "How success was measured", hint: "Numbers, feedback, before and after.", area: true, required: false },
  { key: "differently", label: "What you'd do differently", hint: "Honest lessons learned.", area: true, required: false },
];

const empty: ReviewInput = { goal: "", audience: "", delivered: "", measured: "", differently: "" };

function Index() {
  const run = useServerFn(reviewProject);
  const [form, setForm] = useState<ReviewInput>(empty);
  const [flags, setFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [critique, setCritique] = useState<Critique | null>(null);
  const [copied, setCopied] = useState(false);

  const ready = !!(form.goal.trim() && form.audience.trim() && form.delivered.trim());

  function update(k: keyof ReviewInput, v: string) {
    setForm({ ...form, [k]: v });
    if (flags.length) setFlags([]);
  }

  async function submit(override = false) {
    setError(false);
    if (!override) {
      const hits = detectSensitive(form);
      if (hits.length) return setFlags(hits);
    }
    setFlags([]);
    setLoading(true);
    setCritique(null);
    try {
      const res = await run({ data: form });
      if (res.ok) setCritique(res.critique);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(empty);
    setCritique(null);
    setFlags([]);
    setError(false);
  }

  async function copy() {
    if (!critique) return;
    await navigator.clipboard.writeText(critiqueToText(critique));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b border-border px-6 py-6 lg:px-10">
        <h1 className="font-serif text-4xl leading-none">
          Work <em className="text-mark">Review</em>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Pressure-test your project description before your manager does.</p>
      </header>

      <div className="grid lg:grid-cols-2">
        <section className="border-border px-6 py-8 lg:border-r lg:px-10">
          <div className="mb-6 flex gap-3 rounded-md border border-mark/40 bg-mark-soft p-4 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-mark" />
            <p>Use generic descriptions only. Don't include employee names, client or customer names, internal tool or system names, or confidential figures.</p>
          </div>

          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (ready && !loading) submit(); }}>
            <p className="text-xs text-muted-foreground">* Required</p>
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-sm font-medium">
                  {f.label}
                  {f.required ? <span className="text-mark"> *</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}
                </Label>
                {f.area ? (
                  <Textarea id={f.key} rows={3} placeholder={f.hint} value={form[f.key]} maxLength={2000}
                    onChange={(e) => update(f.key, e.target.value)} className="bg-card" />
                ) : (
                  <Input id={f.key} placeholder={f.hint} value={form[f.key]} maxLength={300}
                    onChange={(e) => update(f.key, e.target.value)} className="bg-card" />
                )}
              </div>
            ))}

            {flags.length > 0 && (
              <div className="rounded-md border border-warn bg-card p-4 text-sm" role="alert">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 text-warn" /> Please generalize these before continuing
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {flags.map((f) => <li key={f} className="rounded bg-mark-soft px-2 py-0.5 font-medium">{f}</li>)}
                </ul>
                <p className="mt-2 text-muted-foreground">These may be names, companies, internal systems, or figures. Try something generic, for example "a VP at a fintech company" instead of a specific name. Edit the text, or continue if they're already generic.</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => submit(true)}>Continue anyway</Button>
              </div>
            )}

            <div className="space-y-2">
              <Button type="submit" size="lg" disabled={!ready || loading || flags.length > 0} className="w-full">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Reviewing...</> : "Review my project"}
              </Button>
              {!ready && <p className="text-center text-xs text-muted-foreground">Fill in the project goal, audience, and what you built to continue.</p>}
            </div>
          </form>
        </section>

        <section className="px-6 py-8 lg:px-10">
          {error && <div className="mb-4 rounded-md border border-destructive p-4 text-sm text-destructive">Something went wrong. Your text is still here. Try again.</div>}
          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground" aria-live="polite">
              <Loader2 className="h-6 w-6 animate-spin text-mark" />
              <p className="text-sm">Reviewing your description.</p>
            </div>
          ) : critique ? (
            <CritiqueView c={critique} onCopy={copy} copied={copied} onReset={reset} />
          ) : !error && (
            <div className="flex min-h-64 items-center justify-center rounded-md border border-dashed border-border p-8 text-center">
              <p className="font-serif text-2xl italic text-muted-foreground">Your critique will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Block({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-5">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-2xl">{title}</h3>
        {tag && <span className="text-xs font-semibold uppercase tracking-widest text-mark">{tag}</span>}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

const List = ({ items, ordered }: { items: string[]; ordered?: boolean }) =>
  items?.length ? (
    ordered ? <ol className="list-decimal space-y-1 pl-5">{items.map((q) => <li key={q}>{q}</li>)}</ol>
      : <ul className="list-disc space-y-1 pl-5">{items.map((q) => <li key={q}>{q}</li>)}</ul>
  ) : <p className="text-muted-foreground">Nothing to flag</p>;

function CritiqueView({ c, onCopy, copied, onReset }: { c: Critique; onCopy: () => void; copied: boolean; onReset: () => void }) {
  const s = Math.max(1, Math.min(5, Math.round(c.clarity.score)));
  return (
    <article>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Critique</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy critique"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw className="h-4 w-4" /> Start over</Button>
        </div>
      </div>
      <Block title="Clarity score" tag={`${s} / 5`}><p>{c.clarity.explanation}</p></Block>
      <Block title="Impact check">
        <p>{c.impact.verdict}</p>
        {c.impact.quote && <blockquote className="border-l-2 border-mark pl-3 italic text-muted-foreground">"{c.impact.quote}"</blockquote>}
      </Block>
      <Block title="Audience fit">
        <p>{c.audienceFit.verdict}</p>
        {c.audienceFit.phraseToChange && (
          <p className="text-muted-foreground">Change <span className="font-medium text-foreground">"{c.audienceFit.phraseToChange}"</span>: {c.audienceFit.suggestion}</p>
        )}
      </Block>
      <Block title="Evidence gaps"><List items={c.evidenceGaps} /></Block>
      <Block title="Likely reviewer questions"><List items={c.reviewerQuestions} ordered /></Block>
      <div className="py-5">
        <h3 className="mb-2 font-serif text-2xl">Suggested rewrite</h3>
        <p className="rounded-md border-l-4 border-mark bg-card p-4 text-sm leading-relaxed">{c.rewrite}</p>
      </div>
    </article>
  );
}
