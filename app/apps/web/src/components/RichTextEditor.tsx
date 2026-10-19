import { useEffect, useRef } from "react";
import { Bold, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "@/lib/format";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Small contentEditable editor. HTML is the system of record; the server
 * sanitizes with an allow list, so the editor only needs to produce reasonable markup.
 */
export function RichTextEditor({ value, onChange, placeholder = "Write something…", minHeight = 140, className, autoFocus }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };

  const tools = [
    { icon: Bold, title: "Bold", run: () => exec("bold") },
    { icon: Italic, title: "Italic", run: () => exec("italic") },
    { icon: List, title: "Bulleted list", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, title: "Numbered list", run: () => exec("insertOrderedList") },
    { icon: Quote, title: "Quote", run: () => exec("formatBlock", "blockquote") },
    {
      icon: Link2,
      title: "Link",
      run: () => {
        const url = window.prompt("Link URL");
        if (url) exec("createLink", url);
      },
    },
  ];

  return (
    <div className={cn("overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900", className)}>
      <div className="flex items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-800/60">
        {tools.map((t) => (
          <button key={t.title} type="button" title={t.title} onMouseDown={(e) => e.preventDefault()} onClick={t.run} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white">
            <t.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="editor prose-doc px-3 py-2.5 text-sm"
        style={{ minHeight }}
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        onBlur={() => onChange(ref.current?.innerHTML ?? "")}
      />
    </div>
  );
}

export const isEmptyHtml = (html: string) => !html.replace(/<br\s*\/?>/gi, "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim();
