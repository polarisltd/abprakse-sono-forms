/**
 * Display id for a document template — 'T001', 'T002', … — derived from the
 * row's own permanent `id`, the same way form_templates derives 'T01' from
 * `slot` (src/lib/templates.ts: slotCode). Unlike that one, this id is never
 * reassigned or reused: a doc_template has no slot/limit, so there is
 * nothing to free and recycle — the id a doctor was assigned stays theirs
 * even if templates are added or archived around it.
 */
export function docTemplateCode(id: number): string {
  return `T${String(id).padStart(3, '0')}`;
}
