import DOMPurify from 'isomorphic-dompurify';

/**
 * Everything the RichTextEditor can ever produce (bold/italic/paragraph,
 * font-size via a styled span) — and nothing else. Run on every write to
 * `doc_templates.body_html` or `statements.body_html`, and again at print
 * time, so a template seeded before this allow-list changes can't carry
 * anything the current one wouldn't permit. See
 * specs/feature-document-templates.md §6.4.
 */
const ALLOWED_TAGS = ['p', 'br', 'b', 'strong', 'i', 'em', 'span'];
const ALLOWED_ATTR = ['style'];

export function sanitizeRichText(html: unknown): string {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
