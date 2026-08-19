/**
 * A small markdown renderer for blog posts.
 *
 * Written rather than installed for two reasons. The obvious one is that this
 * project has no markdown dependency and adding a parser plus a sanitiser to
 * render admin-authored prose is a lot of weight. The real one is safety: a
 * general parser produces arbitrary HTML which then *must* be sanitised, and
 * getting that wrong is an XSS hole. Here every character of user text is
 * escaped first and the tags are ones this file emits, so there is no path from
 * input to markup at all.
 *
 * Supported: headings, bold, italic, inline code, links, images, unordered and
 * ordered lists, blockquotes, fenced code blocks, horizontal rules, paragraphs.
 * Raw HTML in the source is escaped, never passed through.
 */

const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

/** Only http(s) and relative URLs — blocks javascript: and data: payloads. */
function safeUrl(raw: string): string | null {
    const url = raw.trim();
    if (/^(https?:\/\/|\/|#|mailto:)/i.test(url)) return url;
    return null;
}

/** Inline formatting, applied to already-escaped text. */
function inline(escaped: string): string {
    let out = escaped;

    // Images before links: the syntax differs by one leading character.
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, alt, url, title) => {
        const href = safeUrl(url);
        if (!href) return m;
        return `<img src="${href}" alt="${alt}"${title ? ` title="${title}"` : ""} loading="lazy" />`;
    });

    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
        const href = safeUrl(url);
        if (!href) return m;
        const external = /^https?:\/\//i.test(href);
        const rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";
        return `<a href="${href}"${rel}>${text}</a>`;
    });

    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

    return out;
}

export function renderMarkdown(source: string): string {
    const lines = escapeHtml(source ?? "").split(/\r?\n/);
    const html: string[] = [];

    let inCode = false;
    let codeBuffer: string[] = [];
    let listType: "ul" | "ol" | null = null;
    let paragraph: string[] = [];
    let quote: string[] = [];

    const flushParagraph = () => {
        if (paragraph.length) {
            html.push(`<p>${inline(paragraph.join(" "))}</p>`);
            paragraph = [];
        }
    };
    const flushList = () => {
        if (listType) { html.push(`</${listType}>`); listType = null; }
    };
    const flushQuote = () => {
        if (quote.length) {
            html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
            quote = [];
        }
    };
    const flushAll = () => { flushParagraph(); flushList(); flushQuote(); };

    for (const line of lines) {
        // Fenced code blocks swallow everything until the closing fence.
        if (/^```/.test(line.trim())) {
            if (inCode) {
                html.push(`<pre><code>${codeBuffer.join("\n")}</code></pre>`);
                codeBuffer = [];
                inCode = false;
            } else {
                flushAll();
                inCode = true;
            }
            continue;
        }
        if (inCode) { codeBuffer.push(line); continue; }

        if (!line.trim()) { flushAll(); continue; }

        const heading = /^(#{1,4})\s+(.*)$/.exec(line);
        if (heading) {
            flushAll();
            const level = heading[1].length + 1; // h1 is the post title
            const capped = Math.min(level, 6);
            html.push(`<h${capped}>${inline(heading[2].trim())}</h${capped}>`);
            continue;
        }

        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
            flushAll();
            html.push("<hr />");
            continue;
        }

        const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
        if (bullet) {
            flushParagraph(); flushQuote();
            if (listType !== "ul") { flushList(); html.push("<ul>"); listType = "ul"; }
            html.push(`<li>${inline(bullet[1])}</li>`);
            continue;
        }

        const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
        if (numbered) {
            flushParagraph(); flushQuote();
            if (listType !== "ol") { flushList(); html.push("<ol>"); listType = "ol"; }
            html.push(`<li>${inline(numbered[1])}</li>`);
            continue;
        }

        const quoted = /^\s*&gt;\s?(.*)$/.exec(line);
        if (quoted) {
            flushParagraph(); flushList();
            quote.push(quoted[1]);
            continue;
        }

        flushList(); flushQuote();
        paragraph.push(line.trim());
    }

    if (inCode && codeBuffer.length) html.push(`<pre><code>${codeBuffer.join("\n")}</code></pre>`);
    flushAll();

    return html.join("\n");
}

/** Plain text, for excerpts and meta descriptions. */
export function markdownToText(source: string): string {
    return (source ?? "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[#>*_`~-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function readingTimeMinutes(source: string): number {
    const words = markdownToText(source).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

export function excerptFrom(source: string, max = 160): string {
    const text = markdownToText(source);
    if (text.length <= max) return text;
    // Cut on a word boundary so the excerpt doesn't end mid-word.
    return text.slice(0, text.lastIndexOf(" ", max) > 0 ? text.lastIndexOf(" ", max) : max).trim() + "…";
}
