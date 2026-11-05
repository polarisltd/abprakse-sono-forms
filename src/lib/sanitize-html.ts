import sanitizeHtmlLib from 'sanitize-html';

/**
 * Everything the RichTextEditor can ever produce (bold/italic/paragraph,
 * font-size via a styled span) — and nothing else. Run on every write to
 * `doc_templates.body_html` or `statements.body_html`, and again at print
 * time, so a template seeded before this allow-list changes can't carry
 * anything the current one wouldn't permit. See
 * specs/feature-document-templates.md §6.4.
 *
 * Uses `sanitize-html` (htmlparser2-based, no DOM) rather than
 * isomorphic-dompurify/jsdom — the latter crashed every API route that
 * imported it at module-load time on Vercel's serverless runtime (jsdom's
 * dynamic requires don't survive Next's function bundling), which took down
 * every form, not just documents, in production. jsdom is a known
 * troublemaker there; this avoids the whole dependency.
 */
export function sanitizeRichText(html: unknown): string {
  if (typeof html !== 'string') return '';
  return sanitizeHtmlLib(html, {
    allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'span'],
    allowedAttributes: { span: ['style'] },
    allowedStyles: {
      span: { 'font-size': [/^\d+(?:\.\d+)?px$/] },
    },
  });
}
