import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { canWrite, type DocumentDetail, type StatusKind } from "@teamroom/shared";
import { api } from "@/lib/api";
import { useApiMutation, useSettings, useStatusReports } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Avatar, Button, Card, EmptyState, ErrorNote, Field, HtmlContent, Input, KindBadge, PageHeader, Pill, Select, Spinner, Tabs } from "@/components/ui";
import { RichTextEditor } from "@/components/RichTextEditor";
import { dateOnly } from "@/lib/format";

type Filter = "" | "team" | "subteam" | "individual";

export function StatusReportsPage() {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const [filter, setFilter] = useState<Filter>("");
  const { data, isLoading, error } = useStatusReports(filter || undefined);
  const [composing, setComposing] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ kind: "status_team" as StatusKind, subject: "", reportOn: new Date().toISOString().slice(0, 10), summaryHtml: "", bodyHtml: "", thisWeek: "", goals: "", issues: "", subteamId: "" });

  const create = useApiMutation((input: typeof form) => api.post<DocumentDetail>("/api/status-reports", { ...input, subteamId: input.subteamId || null }), () => {
    setComposing(false);
    setForm({ ...form, subject: "", summaryHtml: "", bodyHtml: "", thisWeek: "", goals: "", issues: "" });
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(form);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Status reports"
        description="Team, subteam and individual status, newest first."
        actions={canWrite(user?.role) && !composing && (
          <Button onClick={() => setComposing(true)}>
            <Plus className="h-4 w-4" /> New report
          </Button>
        )}
      />
      <div className="mb-4">
        <Tabs value={filter} onChange={setFilter} options={[{ value: "", label: "All" }, { value: "team", label: "Team" }, { value: "subteam", label: "Subteam" }, { value: "individual", label: "Individual" }]} />
      </div>

      {composing && (
        <form onSubmit={submit} className="mb-6">
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Report type">
                <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as StatusKind })}>
                  <option value="status_team">Team status</option>
                  <option value="status_subteam">Subteam status</option>
                  <option value="status_individual">Individual status</option>
                </Select>
              </Field>
              <Field label="Report date">
                <Input type="date" value={form.reportOn} onChange={(e) => setForm({ ...form, reportOn: e.target.value })} required />
              </Field>
              <Field label="Subteam">
                <Select value={form.subteamId} onChange={(e) => setForm({ ...form, subteamId: e.target.value })} required={form.kind === "status_subteam"}>
                  <option value="">{form.kind === "status_subteam" ? "Choose…" : "None"}</option>
                  {settings?.subteams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Subject">
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required placeholder="e.g. Platform: sprint 15" />
            </Field>
            <div>
              <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">{form.kind === "status_individual" ? "Key thought" : "Summary"}</span>
              <RichTextEditor value={form.summaryHtml} onChange={(summaryHtml) => setForm({ ...form, summaryHtml })} minHeight={80} />
            </div>
            {form.kind === "status_individual" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {(["thisWeek", "goals", "issues"] as const).map((k) => (
                  <div key={k}>
                    <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">{{ thisWeek: "This week", goals: "Goals", issues: "Issues" }[k]}</span>
                    <RichTextEditor value={form[k]} onChange={(v) => setForm({ ...form, [k]: v })} minHeight={90} />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">Details</span>
                <RichTextEditor value={form.bodyHtml} onChange={(bodyHtml) => setForm({ ...form, bodyHtml })} minHeight={140} />
              </div>
            )}
            <ErrorNote error={create.error} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setComposing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || !form.subject}>
                Publish report
              </Button>
            </div>
          </Card>
        </form>
      )}

      {isLoading && <Spinner />}
      <ErrorNote error={error} />
      <div className="space-y-3">
        {data?.map((r) => {
          const expanded = !!open[r.id];
          return (
            <Card key={r.id} as="article" className="p-5">
              <div className="flex items-start gap-3">
                <Avatar user={r.author} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <KindBadge kind={r.kind} />
                    {r.subteam && (
                      <Link to={`/subteams/${r.subteam.id}`}>
                        <Pill tone="info">{r.subteam.name}</Pill>
                      </Link>
                    )}
                    <span className="text-xs text-slate-500">{r.reportOn && dateOnly(r.reportOn)}</span>
                  </div>
                  <h2 className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white">{r.subject}</h2>
                  <p className="text-xs text-slate-500">{r.author.displayName}</p>
                  {r.summaryHtml && <HtmlContent html={r.summaryHtml} className="mt-2 text-sm" />}
                  {expanded && (
                    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                      {r.bodyHtml && <HtmlContent html={r.bodyHtml} className="text-sm" />}
                      {r.kind === "status_individual" && (
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            ["This week", r.thisWeek],
                            ["Goals", r.goals],
                            ["Issues", r.issues],
                          ].map(([label, html]) => (
                            <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                              <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
                              {html ? <HtmlContent html={html} className="mt-1 text-sm" /> : <p className="mt-1 text-sm text-slate-400">—</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {(r.bodyHtml || r.kind === "status_individual") && (
                    <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={() => setOpen({ ...open, [r.id]: !expanded })}>
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} {expanded ? "Less" : "Full report"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {data && data.length === 0 && <EmptyState title="No status reports" />}
      </div>
    </div>
  );
}
