import { Link } from "react-router";
import { CalendarClock, CheckCircle2, Circle, MapPin, MessageSquare } from "lucide-react";
import type { DocumentSummary } from "@teamroom/shared";
import { Avatar, AvatarStack, KindBadge, Pill, TagChip } from "./ui";
import { cn, dateOnly, isOverdue, relative, timeRange } from "@/lib/format";

export function DocumentCard({ doc, compact }: { doc: DocumentSummary; compact?: boolean }) {
  const overdue = isOverdue(doc.dueOn, doc.status);
  return (
    <article className={cn("group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700", compact && "p-3")}>
      <div className="flex items-start gap-3">
        <Avatar user={doc.author} size={compact ? "sm" : "md"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={doc.kind} />
            {doc.kind === "action" && doc.status && (
              <Pill tone={doc.status === "complete" ? "success" : overdue ? "danger" : "warning"}>
                {doc.status === "complete" ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {doc.status === "complete" ? "Complete" : overdue ? `Overdue · ${dateOnly(doc.dueOn!)}` : doc.dueOn ? `Due ${dateOnly(doc.dueOn)}` : "Open"}
              </Pill>
            )}
            {doc.kind === "action" && doc.priority && <Pill tone={doc.priority <= 2 ? "danger" : "neutral"}>P{doc.priority}</Pill>}
            {doc.subteam && <span className="text-xs text-slate-500">{doc.subteam.name}</span>}
          </div>
          <h3 className={cn("mt-1.5 font-semibold text-slate-900 dark:text-white", compact ? "text-sm" : "text-base")}>
            <Link to={`/documents/${doc.id}`} className="after:absolute after:inset-0 group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {doc.subject}
            </Link>
          </h3>
          {!compact && doc.abstract && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{doc.abstract}</p>}
          {doc.kind === "meeting" && doc.startsAt && doc.endsAt && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" /> {timeRange(doc.startsAt, doc.endsAt)}
              </span>
              {doc.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {doc.location}
                </span>
              )}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
            <span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{doc.author.displayName}</span> · {relative(doc.lastActivityAt)}
            </span>
            {doc.commentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> {doc.commentCount}
              </span>
            )}
            {doc.assignees.length > 0 && (
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <AvatarStack users={doc.assignees} max={3} />
              </span>
            )}
            {doc.tags.length > 0 && (
              <span className="relative z-10 flex flex-wrap gap-1">
                {doc.tags.map((t) => (
                  <TagChip key={t} name={t} />
                ))}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
