import { useState, type FormEvent } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { canManage, canWrite, type DocumentDetail } from "@teamroom/shared";
import { api } from "@/lib/api";
import { useAnnouncements, useApiMutation } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Avatar, Button, Card, EmptyState, ErrorNote, Field, HtmlContent, Input, PageHeader, Spinner } from "@/components/ui";
import { isEmptyHtml, RichTextEditor } from "@/components/RichTextEditor";
import { dateTime } from "@/lib/format";

export function AnnouncementsPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useAnnouncements();
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  const create = useApiMutation((input: { subject: string; bodyHtml: string }) => api.post<DocumentDetail>("/api/announcements", input), () => {
    setComposing(false);
    setSubject("");
    setBodyHtml("");
  });
  const remove = useApiMutation((id: string) => api.del(`/api/announcements/${id}`));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || isEmptyHtml(bodyHtml)) return;
    create.mutate({ subject, bodyHtml });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Announcements"
        description="Broadcasts to the whole team. Announcements do not have responses."
        actions={canWrite(user?.role) && !composing && (
          <Button onClick={() => setComposing(true)}>
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        )}
      />
      {composing && (
        <form onSubmit={submit} className="mb-6">
          <Card className="space-y-4 p-5">
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} required autoFocus placeholder="Short and clear" />
            </Field>
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="What does the team need to know?" />
            <ErrorNote error={create.error} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setComposing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || !subject.trim() || isEmptyHtml(bodyHtml)}>
                Publish
              </Button>
            </div>
          </Card>
        </form>
      )}
      {isLoading && <Spinner />}
      <ErrorNote error={error} />
      <div className="space-y-4">
        {data?.map((a) => (
          <Card key={a.id} as="article" className="p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
                <Megaphone className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{a.subject}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Avatar user={a.author} size="xs" /> {a.author.displayName} · {dateTime(a.createdAt)}
                </p>
                <HtmlContent html={a.bodyHtml} className="mt-3" />
              </div>
              {(canManage(user?.role) || a.author.id === user?.id) && (
                <Button variant="ghost" size="sm" title="Delete" onClick={() => remove.mutate(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
        {data && data.length === 0 && <EmptyState title="No announcements" />}
      </div>
    </div>
  );
}
