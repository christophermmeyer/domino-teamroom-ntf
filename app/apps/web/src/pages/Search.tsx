import { Link, useSearchParams } from "react-router";
import { Flag } from "lucide-react";
import { useSearch } from "@/lib/queries";
import { Avatar, Card, EmptyState, ErrorNote, PageHeader, Pill, Spinner } from "@/components/ui";
import { DocumentCard } from "@/components/DocumentCard";
import { dateOnly } from "@/lib/format";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { data, isLoading, error } = useSearch(q);
  const total = data ? data.documents.length + data.milestones.length + data.members.length : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={q ? `Results for “${q}”` : "Search"} description={q.trim().length < 2 ? "Type at least two characters in the search box." : data ? `${total} ${total === 1 ? "match" : "matches"} across documents, responses, milestones and people.` : undefined} />
      {isLoading && <Spinner />}
      <ErrorNote error={error} />
      {data && total === 0 && <EmptyState title="Nothing found" description="Try a different word or a tag." />}
      {data && data.members.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">People</h2>
          <div className="flex flex-wrap gap-2">
            {data.members.map((m) => (
              <Link key={m.id} to={`/members/${m.id}`}>
                <Card className="flex items-center gap-2 px-3 py-2 hover:border-brand-300">
                  <Avatar user={m} size="sm" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{m.displayName}</span>
                  <span className="text-xs text-slate-500">{m.jobTitle}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
      {data && data.milestones.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Milestones</h2>
          <div className="space-y-2">
            {data.milestones.map((m) => (
              <Link key={m.id} to="/milestones">
                <Card className="flex items-center justify-between px-4 py-3 hover:border-brand-300">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                    <Flag className="h-4 w-4 text-fuchsia-500" /> {m.title}
                  </span>
                  <Pill>{dateOnly(m.occursOn)}</Pill>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
      {data && data.documents.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Documents</h2>
          <div className="space-y-3">
            {data.documents.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
