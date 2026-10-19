import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { THREAD_KINDS, type CreateTopicInput, type DocumentDetail, type ThreadKind } from "@teamroom/shared";
import { api } from "@/lib/api";
import { useApiMutation, useMembers, useSettings, useThread } from "@/lib/queries";
import { Button, Card, ErrorNote, Field, Input, PageHeader, Select, Spinner, TagChip } from "@/components/ui";
import { isEmptyHtml, RichTextEditor } from "@/components/RichTextEditor";
import { cn, fromLocalInput, kindLabel, toLocalInput } from "@/lib/format";

interface FormState {
  kind: ThreadKind;
  subject: string;
  bodyHtml: string;
  tags: string[];
  subteamId: string;
  priority: number;
  dueOn: string;
  assigneeIds: string[];
  startsAt: string;
  endsAt: string;
  location: string;
}

const empty = (kind: ThreadKind): FormState => ({ kind, subject: "", bodyHtml: "", tags: [], subteamId: "", priority: 3, dueOn: "", assigneeIds: [], startsAt: "", endsAt: "", location: "" });

export function DocumentFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { data: members } = useMembers();
  const { data: existing, isLoading } = useThread(id);
  const [form, setForm] = useState<FormState>(() => empty((params.get("kind") as ThreadKind) || "discussion"));
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!existing) return;
    const r = existing.root;
    setForm({
      kind: r.kind as ThreadKind,
      subject: r.subject,
      bodyHtml: r.bodyHtml,
      tags: r.tags,
      subteamId: r.subteam?.id ?? "",
      priority: r.priority ?? 3,
      dueOn: r.dueOn ?? "",
      assigneeIds: r.assignees.map((a) => a.id),
      startsAt: toLocalInput(r.startsAt),
      endsAt: toLocalInput(r.endsAt),
      location: r.location ?? "",
    });
  }, [existing]);

  const save = useApiMutation(
    (input: CreateTopicInput) => (id ? api.patch<DocumentDetail>(`/api/documents/${id}`, input) : api.post<DocumentDetail>("/api/documents", input)),
    (doc) => navigate(`/documents/${doc.id}`),
  );

  if (id && isLoading) return <Spinner />;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleTag = (t: string) => update("tags", form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t]);
  const addTag = () => {
    const t = newTag.trim();
    if (t && !form.tags.includes(t)) update("tags", [...form.tags, t]);
    setNewTag("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isEmptyHtml(form.bodyHtml)) return;
    save.mutate({
      kind: form.kind,
      subject: form.subject,
      bodyHtml: form.bodyHtml,
      tags: form.tags,
      subteamId: form.subteamId || null,
      priority: form.kind === "action" ? form.priority : null,
      dueOn: form.kind === "action" && form.dueOn ? form.dueOn : null,
      assigneeIds: form.kind === "action" ? form.assigneeIds : [],
      startsAt: form.kind === "meeting" ? fromLocalInput(form.startsAt) : null,
      endsAt: form.kind === "meeting" ? fromLocalInput(form.endsAt) : null,
      timezone: form.kind === "meeting" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      location: form.kind === "meeting" ? form.location || null : null,
    });
  };

  const allTags = [...new Set([...(settings?.tags.map((t) => t.name) ?? []), ...form.tags])];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={id ? "Edit document" : "New document"} description={id ? undefined : "Pick a type, write it up, and tag it so the team can find it."} />
      <form onSubmit={submit}>
        <Card className="space-y-5 p-6">
          {!id && (
            <div>
              <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">Type</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {THREAD_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => update("kind", k)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                      form.kind === k ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300",
                    )}
                  >
                    {kindLabel(k, settings)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field label="Subject">
            <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} required maxLength={200} placeholder="What is this about?" />
          </Field>

          <div>
            <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">Body</span>
            <RichTextEditor value={form.bodyHtml} onChange={(html) => update("bodyHtml", html)} minHeight={200} placeholder="Write the details…" />
          </div>

          {form.kind === "action" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Due date">
                <Input type="date" value={form.dueOn} onChange={(e) => update("dueOn", e.target.value)} />
              </Field>
              <Field label="Priority" hint="1 is highest">
                <Select value={form.priority} onChange={(e) => update("priority", Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-3">
                <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">Assigned to</span>
                <div className="flex flex-wrap gap-1.5">
                  {members
                    ?.filter((m) => m.role !== "reader")
                    .map((m) => (
                      <TagChip key={m.id} plain name={m.displayName} active={form.assigneeIds.includes(m.id)} onClick={() => update("assigneeIds", form.assigneeIds.includes(m.id) ? form.assigneeIds.filter((x) => x !== m.id) : [...form.assigneeIds, m.id])} />
                    ))}
                </div>
              </div>
            </div>
          )}

          {form.kind === "meeting" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Starts">
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} required />
              </Field>
              <Field label="Ends">
                <Input type="datetime-local" value={form.endsAt} onChange={(e) => update("endsAt", e.target.value)} required />
              </Field>
              <Field label="Location">
                <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Room or link" />
              </Field>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subteam">
              <Select value={form.subteamId} onChange={(e) => update("subteamId", e.target.value)}>
                <option value="">Whole team</option>
                {settings?.subteams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t) => (
                <TagChip key={t} name={t} active={form.tags.includes(t)} onClick={() => toggleTag(t)} />
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag" className="w-48" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
              <Button type="button" variant="secondary" size="sm" onClick={addTag} className="h-9.5">
                Add tag
              </Button>
            </div>
          </div>

          <ErrorNote error={save.error} />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !form.subject.trim() || isEmptyHtml(form.bodyHtml)}>
              {save.isPending ? "Saving…" : id ? "Save changes" : `Post ${kindLabel(form.kind, settings).toLowerCase()}`}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
