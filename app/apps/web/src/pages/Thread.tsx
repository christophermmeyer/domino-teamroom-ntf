import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Archive, ArchiveRestore, CalendarClock, CheckCircle2, Circle, CornerDownRight, MapPin, Pencil, Reply, Trash2 } from "lucide-react";
import { canManage, canWrite, type Comment, type DocumentDetail } from "@teamroom/shared";
import { api } from "@/lib/api";
import { useApiMutation, useThread } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarStack, Button, Card, ErrorNote, HtmlContent, KindBadge, Pill, Spinner, TagChip } from "@/components/ui";
import { isEmptyHtml, RichTextEditor } from "@/components/RichTextEditor";
import { cn, dateOnly, dateTime, isOverdue, relative, timeRange } from "@/lib/format";

interface Node {
  comment: Comment;
  children: Node[];
}

function buildTree(comments: Comment[], rootId: string): Node[] {
  const byParent = new Map<string, Comment[]>();
  for (const c of comments) {
    const list = byParent.get(c.parentId) ?? [];
    list.push(c);
    byParent.set(c.parentId, list);
  }
  const build = (parentId: string): Node[] => (byParent.get(parentId) ?? []).map((c) => ({ comment: c, children: build(c.id) }));
  return build(rootId);
}

export function ThreadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, error } = useThread(id);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyHtml, setReplyHtml] = useState("");

  const reply = useApiMutation((input: { parentId: string; bodyHtml: string }) => api.post<Comment>(`/api/documents/${data!.root.id}/comments`, input), () => {
    setReplyTo(null);
    setReplyHtml("");
  });
  const setStatus = useApiMutation((status: "open" | "complete") => api.patch<DocumentDetail>(`/api/documents/${data!.root.id}`, { status }));
  const toggleInactive = useApiMutation(async (inactive: boolean) => (inactive ? api.post(`/api/documents/${data!.root.id}/inactive`) : api.del(`/api/documents/${data!.root.id}/inactive`)));
  const remove = useApiMutation(() => api.del(`/api/documents/${data!.root.id}`), () => navigate("/documents"));
  const removeComment = useApiMutation((commentId: string) => api.del(`/api/documents/${commentId}`));

  const tree = useMemo(() => (data ? buildTree(data.comments, data.root.id) : []), [data]);

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorNote error={error ?? "Not found"} />;
  const { root } = data;
  const mayEdit = canManage(user?.role) || (user?.role === "member" && root.author.id === user.id);
  const isAssignee = root.assignees.some((a) => a.id === user?.id);
  const writer = canWrite(user?.role);
  const overdue = isOverdue(root.dueOn, root.status);

  const submitReply = (parentId: string) => {
    if (isEmptyHtml(replyHtml)) return;
    reply.mutate({ parentId, bodyHtml: replyHtml });
  };

  const replyBox = (parentId: string) => (
    <div className="mt-3 space-y-2">
      <RichTextEditor value={replyHtml} onChange={setReplyHtml} placeholder="Write a reply…" minHeight={100} autoFocus />
      <ErrorNote error={reply.error} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => submitReply(parentId)} disabled={reply.isPending || isEmptyHtml(replyHtml)}>
          {reply.isPending ? "Posting…" : "Post reply"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderNode = (node: Node, depth: number) => {
    const c = node.comment;
    const own = c.author.id === user?.id;
    return (
      <li key={c.id} className={cn(depth > 0 && "ml-4 border-l-2 border-slate-200 pl-4 sm:ml-6 sm:pl-5 dark:border-slate-800")}>
        <div className="py-3">
          <div className="flex items-start gap-3">
            <Avatar user={c.author} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <Link to={`/members/${c.author.id}`} className="font-medium text-slate-900 hover:underline dark:text-white">
                  {c.author.displayName}
                </Link>
                <span className="text-slate-500"> · {relative(c.createdAt)}</span>
                {depth > 0 && <CornerDownRight className="ml-1 inline h-3 w-3 text-slate-400" />}
              </p>
              <HtmlContent html={c.bodyHtml} className="mt-1 text-sm" />
              <div className="mt-1.5 flex gap-1">
                {writer && (
                  <Button variant="ghost" size="sm" onClick={() => { setReplyTo(c.id); setReplyHtml(""); }}>
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </Button>
                )}
                {(canManage(user?.role) || own) && (
                  <Button variant="ghost" size="sm" onClick={() => removeComment.mutate(c.id)} title="Delete comment">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {replyTo === c.id && replyBox(c.id)}
            </div>
          </div>
        </div>
        {node.children.length > 0 && <ul>{node.children.map((n) => renderNode(n, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <nav className="text-xs text-slate-500">
        <Link to="/documents" className="hover:underline">All documents</Link> <span className="mx-1">/</span> <span className="text-slate-700 dark:text-slate-300">{root.subject}</span>
      </nav>

      <Card as="article" className="overflow-hidden">
        {root.inactiveAt && <div className="bg-amber-50 px-6 py-2 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">This document is inactive. It is hidden from the main lists.</div>}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={root.kind} />
            {root.kind === "action" && root.status && (
              <Pill tone={root.status === "complete" ? "success" : overdue ? "danger" : "warning"}>
                {root.status === "complete" ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {root.status === "complete" ? "Complete" : overdue ? "Overdue" : "Open"}
              </Pill>
            )}
            {root.kind === "discussion" && root.status === "complete" && <Pill tone="success">Review complete</Pill>}
            {root.kind === "action" && root.priority && <Pill tone={root.priority <= 2 ? "danger" : "neutral"}>Priority {root.priority}</Pill>}
            {root.subteam && (
              <Link to={`/subteams/${root.subteam.id}`}>
                <Pill tone="info">{root.subteam.name}</Pill>
              </Link>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{root.subject}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <Link to={`/members/${root.author.id}`} className="inline-flex items-center gap-2">
              <Avatar user={root.author} size="sm" />
              <span className="font-medium text-slate-800 dark:text-slate-200">{root.author.displayName}</span>
            </Link>
            <span>{dateTime(root.createdAt)}</span>
            {root.kind === "action" && root.dueOn && <span className={cn(overdue && "font-medium text-red-600")}>Due {dateOnly(root.dueOn)}</span>}
            {root.kind === "meeting" && root.startsAt && root.endsAt && (
              <>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-4 w-4" /> {timeRange(root.startsAt, root.endsAt)}
                  {root.timezone && <span className="text-xs text-slate-400">({root.timezone})</span>}
                </span>
                {root.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {root.location}
                  </span>
                )}
              </>
            )}
          </div>
          {root.assignees.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="text-xs font-medium text-slate-500 uppercase">Assigned to</span>
              <AvatarStack users={root.assignees} />
              <span>{root.assignees.map((a) => a.displayName).join(", ")}</span>
            </div>
          )}

          <HtmlContent html={root.bodyHtml} className="mt-6" />

          {root.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {root.tags.map((t) => (
                <TagChip key={t} name={t} />
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {writer && (
              <Button onClick={() => { setReplyTo(root.id); setReplyHtml(""); }}>
                <Reply className="h-4 w-4" /> Reply
              </Button>
            )}
            {root.kind === "action" && (mayEdit || isAssignee) && (
              <Button variant="secondary" onClick={() => setStatus.mutate(root.status === "complete" ? "open" : "complete")} disabled={setStatus.isPending}>
                {root.status === "complete" ? <Circle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {root.status === "complete" ? "Reopen" : "Mark complete"}
              </Button>
            )}
            {root.kind === "discussion" && mayEdit && (
              <Button variant="secondary" onClick={() => setStatus.mutate(root.status === "complete" ? "open" : "complete")} disabled={setStatus.isPending}>
                <CheckCircle2 className="h-4 w-4" /> {root.status === "complete" ? "Reopen review" : "Review complete"}
              </Button>
            )}
            {mayEdit && (
              <>
                <Button variant="secondary" onClick={() => navigate(`/documents/${root.id}/edit`)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="secondary" onClick={() => toggleInactive.mutate(!root.inactiveAt)}>
                  {root.inactiveAt ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  {root.inactiveAt ? "Restore" : "Mark inactive"}
                </Button>
                <Button variant="ghost" className="ml-auto text-red-600" onClick={() => { if (window.confirm("Delete this document and all its responses?")) remove.mutate(undefined as never); }}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </div>
          <ErrorNote error={setStatus.error || toggleInactive.error || remove.error} />
          {replyTo === root.id && replyBox(root.id)}
        </div>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {data.comments.length} {data.comments.length === 1 ? "response" : "responses"}
        </h2>
        <Card className="px-5">
          {tree.length === 0 ? <p className="py-6 text-sm text-slate-500">No responses yet.</p> : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{tree.map((n) => renderNode(n, 0))}</ul>}
        </Card>
      </section>
    </div>
  );
}
