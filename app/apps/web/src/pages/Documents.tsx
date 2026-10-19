import { useSearchParams } from "react-router";
import { Plus, X } from "lucide-react";
import { canWrite, THREAD_KINDS, type DocumentView, type ThreadKind } from "@teamroom/shared";
import { useDocuments, useSettings } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { DocumentCard } from "@/components/DocumentCard";
import { Button, EmptyState, ErrorNote, Input, LinkButton, PageHeader, Select, Spinner, TagChip, Tabs } from "@/components/ui";
import { kindLabel } from "@/lib/format";

const VIEWS: { value: DocumentView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "Created by me" },
  { value: "assigned", label: "Assigned to me" },
  { value: "due", label: "Open by due date" },
];

export function DocumentsPage({ inactive }: { inactive?: boolean }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: settings } = useSettings();
  const view = inactive ? "inactive" : ((params.get("view") as DocumentView) ?? "all");
  const kind = params.get("kind") ?? "";
  const tag = params.get("tag") ?? "";
  const subteam = params.get("subteam") ?? "";
  const q = params.get("q") ?? "";
  const { data, isLoading, error } = useDocuments({ view, kind, tag, subteam, q });

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const hasFilters = !!(kind || tag || subteam || q);

  return (
    <div>
      <PageHeader
        title={inactive ? "Inactive documents" : "All documents"}
        description={inactive ? "Documents that were filed or marked inactive. They stay searchable and can be restored." : "Every discussion, action item, meeting and reference in the room."}
        actions={!inactive && canWrite(user?.role) && (
          <LinkButton to="/documents/new">
            <Plus className="h-4 w-4" /> New document
          </LinkButton>
        )}
      />

      <div className="mb-4 flex flex-col gap-3">
        {!inactive && <Tabs value={view} onChange={(v) => set("view", v === "all" ? "" : v)} options={VIEWS} />}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={kind} onChange={(e) => set("kind", e.target.value)} className="w-auto">
            <option value="">All types</option>
            {THREAD_KINDS.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k as ThreadKind, settings)}
              </option>
            ))}
          </Select>
          <Select value={subteam} onChange={(e) => set("subteam", e.target.value)} className="w-auto">
            <option value="">All subteams</option>
            {settings?.subteams.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input value={q} onChange={(e) => set("q", e.target.value)} placeholder="Filter by text…" className="w-56" />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setParams(inactive ? {} : view !== "all" ? { view } : {}, { replace: true })}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
        {settings && settings.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-slate-500 uppercase">Tags</span>
            {settings.tags.map((t) => (
              <TagChip key={t.id} name={t.name} count={t.count} active={tag === t.name} onClick={() => set("tag", tag === t.name ? "" : t.name)} />
            ))}
          </div>
        )}
      </div>

      {isLoading && <Spinner />}
      <ErrorNote error={error} />
      {data && data.length === 0 && <EmptyState title="No documents match" description={hasFilters ? "Try clearing a filter." : "Nothing here yet."} />}
      <div className="space-y-3">
        {data?.map((d) => (
          <DocumentCard key={d.id} doc={d} />
        ))}
      </div>
    </div>
  );
}
