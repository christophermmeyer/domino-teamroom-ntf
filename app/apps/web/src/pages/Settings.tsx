import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import { canManage, THREAD_KINDS, type Settings, type ThreadKind } from "@teamroom/shared";
import { api } from "@/lib/api";
import { useApiMutation, useSettings } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Button, Card, ErrorNote, Field, Input, PageHeader, Spinner, Textarea } from "@/components/ui";

const DEFAULT_LABELS: Record<ThreadKind, string> = { discussion: "Discussion", action: "Action Item", meeting: "Meeting", reference: "Reference" };

export function SettingsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useSettings();
  const [form, setForm] = useState({ name: "", purpose: "", labels: DEFAULT_LABELS, showMembers: true, showSubteams: true, showMilestones: true });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm({ name: data.name, purpose: data.purpose, labels: data.labels, showMembers: data.showMembers, showSubteams: data.showSubteams, showMilestones: data.showMilestones });
  }, [data]);

  const save = useApiMutation((input: typeof form) => api.patch<Settings>("/api/settings", input), () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  });

  if (!canManage(user?.role)) return <Navigate to="/" replace />;
  if (isLoading || !data) return <Spinner />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="TeamRoom setup" description="Room basics, the four document type labels, and which panels the home page shows." />
      <form onSubmit={submit} className="space-y-6">
        <Card className="space-y-4 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Basics</h2>
          <Field label="Team name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Purpose" hint="Shown on the home page.">
            <Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </Field>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase">Leader</dt>
              <dd className="text-slate-800 dark:text-slate-200">{data.leader?.displayName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase">Facilitator</dt>
              <dd className="text-slate-800 dark:text-slate-200">{data.facilitator?.displayName ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Document types</h2>
            <p className="mt-0.5 text-xs text-slate-500">Rename the four built-in types. Behaviour stays the same; only the label changes everywhere in the room.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {THREAD_KINDS.map((k) => (
              <Field key={k} label={`${DEFAULT_LABELS[k]} label`}>
                <Input value={form.labels[k]} onChange={(e) => setForm({ ...form, labels: { ...form.labels, [k]: e.target.value } })} required />
              </Field>
            ))}
          </div>
        </Card>

        <Card className="space-y-3 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Home page panels</h2>
          {(
            [
              ["showMembers", "Show team members"],
              ["showSubteams", "Show subteams"],
              ["showMilestones", "Show milestones in “Coming up”"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              {label}
            </label>
          ))}
        </Card>

        <ErrorNote error={save.error} />
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save setup"}
          </Button>
        </div>
      </form>
    </div>
  );
}
