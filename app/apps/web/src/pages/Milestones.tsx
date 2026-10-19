import { useState, type FormEvent } from "react";
import { Flag, Plus } from "lucide-react";
import { canWrite, type Milestone } from "@teamroom/shared";
import { api } from "@/lib/api";
import { useApiMutation, useMilestones } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Avatar, Button, Card, EmptyState, ErrorNote, Field, HtmlContent, Input, PageHeader, Pill, Spinner } from "@/components/ui";
import { RichTextEditor } from "@/components/RichTextEditor";
import { cn, dateOnly } from "@/lib/format";

export function MilestonesPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useMilestones();
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ title: "", summary: "", detailHtml: "", occursOn: "" });
  const create = useApiMutation((input: typeof form) => api.post<Milestone>("/api/milestones", input), () => {
    setComposing(false);
    setForm({ title: "", summary: "", detailHtml: "", occursOn: "" });
  });
  const today = new Date().toISOString().slice(0, 10);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(form);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Milestones"
        description="Key dates for the team. Documents can reference these; they also appear on the calendar."
        actions={canWrite(user?.role) && !composing && (
          <Button onClick={() => setComposing(true)}>
            <Plus className="h-4 w-4" /> New milestone
          </Button>
        )}
      />
      {composing && (
        <form onSubmit={submit} className="mb-6">
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <Field label="Title">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
              </Field>
              <Field label="Date">
                <Input type="date" value={form.occursOn} onChange={(e) => setForm({ ...form, occursOn: e.target.value })} required />
              </Field>
            </div>
            <Field label="Summary">
              <Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="One line" />
            </Field>
            <RichTextEditor value={form.detailHtml} onChange={(detailHtml) => setForm({ ...form, detailHtml })} placeholder="Details (optional)" minHeight={100} />
            <ErrorNote error={create.error} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setComposing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || !form.title || !form.occursOn}>
                Save milestone
              </Button>
            </div>
          </Card>
        </form>
      )}
      {isLoading && <Spinner />}
      <ErrorNote error={error} />
      <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6 dark:border-slate-800">
        {data?.map((m) => {
          const past = m.occursOn < today;
          return (
            <li key={m.id} className="relative">
              <span className={cn("absolute top-5 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-slate-50 dark:ring-slate-950", past ? "bg-slate-300 dark:bg-slate-700" : "bg-fuchsia-500")} />
              <Card as="article" className={cn("p-5", past && "opacity-70")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                    <Flag className="h-4 w-4 text-fuchsia-500" /> {m.title}
                  </h2>
                  <Pill tone={past ? "neutral" : "info"}>{dateOnly(m.occursOn)}</Pill>
                </div>
                {m.summary && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{m.summary}</p>}
                {m.detailHtml && <HtmlContent html={m.detailHtml} className="mt-3 text-sm" />}
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <Avatar user={m.author} size="xs" /> {m.author.displayName}
                </p>
              </Card>
            </li>
          );
        })}
      </ol>
      {data && data.length === 0 && <EmptyState title="No milestones" />}
    </div>
  );
}
