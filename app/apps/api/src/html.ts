import sanitizeHtml from "sanitize-html";

/** Allow list from the plan: rich text that survives, scripts and handlers that do not. */
const options: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "blockquote", "pre", "code", "span", "div"],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

export function cleanHtml(input: string): string {
  return sanitizeHtml(input, options).trim();
}

export function htmlToText(html: string): string {
  const spaced = html.replace(/<\/(p|div|li|h[1-6]|tr|blockquote|pre)>|<br\s*\/?>/gi, "$& ");
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function abstractOf(html: string): string {
  return htmlToText(html).slice(0, 200);
}
