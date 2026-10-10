import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Copy, Check, Loader2, ShieldAlert } from "lucide-react";
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
  { key: "audience", label: "Audience", hint: "e.g. VP of Sales, engineering peers", area: false, required: true },
  { key: "delivered", label: "What you built or delivered", hint: "The concrete output of your work", area: true, required: true },
  { key: "measured", label: "How success was measured", hint: "Numbers, feedback, before and after", area: true, required: false },
  { key: "differently", label: "What you'd do differently", hint: "Honest lessons learned", area: true, required: false },
];

const empty: ReviewInput = { goal: "", audience: "", delivered: "", measured: "", differently: "" };

function Index() {
  const run = useServerFn(reviewProject);
  const [form, setForm] = useState<ReviewInput>(empty);
  const [flags, setFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [critique, setCritique] = useState<Critique | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = form.goal.trim() && form.audience.trim() && form.delivered.trim() && !loading;

  async function submit(override = false) {
    setError(null);
    const hits = detectSensitive(form);
    if (hits.length && !override) {
      setFlags(hits);
      return;
    }
    setFlags([]);
    setLoading(true);
    setCritique(null);
    try {
      const res = await run({ data: form });
      if (!res.ok) setError(res.error);
      else if (res.critique.sensitive && res.critique.sensitiveItems?.length && !override) {
        setFlags(res.critique.sensitiveItems);
      } else setCritique(res.critique);
    } catch {
      setError("Could not reach the reviewer. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <p>Do not enter confidential company information, personal data, or employee names. Use generic descriptions only.</p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-sm font-medium">
                  {f.label} {!f.required && <span className="font-normal text-muted-foreground">(optional)</span>}
                </Label>
                {f.area ? (
                  <Textarea id={f.key} rows={3} placeholder={f.hint} value={form[f.key]} maxLength={2000}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="bg-card" />
                ) : (
                  <Input id={f.key} placeholder={f.hint} value={form[f.key]} maxLength={300}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="bg-card" />
                )}
              </div>
            ))}

            {flags.length > 0 && (
              <div className="rounded-md border border-warn bg-card p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 text-warn" /> Please generalize before continuing
                </p>
                <p className="mt-1 text-muted-foreground">These look like names, customer data, or internal system names. Replace them with generic terms (e.g. "a teammate", "our billing tool").</p>
                <ul className="mt-2 list-disc pl-5">{flags.map((f) => <li key={f}>{f}</li>)}</ul>
                <button type="button" onClick={() => submit(true)} className="mt-3 text-xs text-muted-foreground underline">
                  These are already generic, continue anyway
                </button>
              </div>
            )}

            <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Reviewing...</> : "Review my project"}
            </Button>
          </form>
        </section>

        <section className="px-6 py-8 lg:px-10">
          {error && <div className="rounded-md border border-destructive p-4 text-sm text-destructive">{error}</div>}
          {loading && <LoadingState />}
          {!loading && !critique && !error && (
            <div className="flex h-full min-h-64 items-center justify-center rounded-md border border-dashed border-border p-8 text-center">
              <p className="font-serif text-2xl italic text-muted-foreground">Your critique will appear here.</p>
            </div>
          )}
          {critique && <CritiqueView c={critique} onCopy={copy} copied={copied} />}
        </section>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Reading like a skeptical reviewer...</p>
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />)}
    </div>
  );
}

function ratingClass(r: string) {
  return r === "strong" ? "text-ok" : r === "partial" ? "text-warn" : "text-mark";
}

function Block({ title, tag, tagClass, children }: { title: string; tag?: string; tagClass?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-5">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-2xl">{title}</h3>
        {tag && <span className={`text-xs font-semibold uppercase tracking-widest ${tagClass}`}>{tag}</span>}
      </div>
      {children}
    </div>
  );
}

function Notes({ verdict, notes }: { verdict: string; notes: string[] }) {
  return (
    <>
      <p className="text-sm font-medium">{verdict}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{notes?.map((n) => <li key={n}>{n}</li>)}</ul>
    </>
  );
}

function CritiqueView({ c, onCopy, copied }: { c: Critique; onCopy: () => void; copied: boolean }) {
  const s = Math.max(1, Math.min(10, Math.round(c.clarity.score)));
  return (
    <article>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Critique</h2>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy critique"}
        </Button>
      </div>
      <Block title="Clarity" tag={`${s}/10`} tagClass={s >= 7 ? "text-ok" : s >= 4 ? "text-warn" : "text-mark"}>
        <Notes verdict={c.clarity.verdict} notes={c.clarity.notes} />
      </Block>
      <Block title="Impact check" tag={c.impact.rating} tagClass={ratingClass(c.impact.rating)}>
        <Notes verdict={c.impact.verdict} notes={c.impact.notes} />
      </Block>
      <Block title="Audience fit" tag={c.audienceFit.rating} tagClass={ratingClass(c.audienceFit.rating)}>
        <Notes verdict={c.audienceFit.verdict} notes={c.audienceFit.notes} />
      </Block>
      <Block title="Evidence gaps">
        {c.evidenceGaps?.length ? (
          <ul className="space-y-2 text-sm">{c.evidenceGaps.map((g) => (
            <li key={g.claim}><span className="font-medium">"{g.claim}"</span><span className="text-muted-foreground"> needs {g.missing}</span></li>
          ))}</ul>
        ) : <p className="text-sm text-muted-foreground">No unsupported claims found.</p>}
      </Block>
      <Block title="Blind spots">
        <ol className="list-decimal space-y-1 pl-5 text-sm">{c.blindSpots?.map((q) => <li key={q}>{q}</li>)}</ol>
      </Block>
      <div className="py-5">
        <h3 className="mb-2 font-serif text-2xl">Suggested rewrite</h3>
        <p className="rounded-md border-l-4 border-mark bg-card p-4 text-sm leading-relaxed">{c.rewrite}</p>
      </div>
    </article>
  );
}
