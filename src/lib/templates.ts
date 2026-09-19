import { FORM_MAP } from './form-definitions';
import { FormField } from './types';

/** Maximum number of template slots per form. Mirrored by a CHECK constraint. */
export const MAX_TEMPLATE_SLOTS = 12;

/** Slot 1 -> 'T01'. Single definition of the display name. */
export function slotCode(slot: number): string {
  return `T${String(slot).padStart(2, '0')}`;
}

/** Flat list of every field in a form definition. */
export function formFields(formId: string): FormField[] {
  const def = FORM_MAP[formId];
  if (!def) return [];
  return def.sections.flatMap((s) => s.rows.flatMap((r) => r.fields));
}

/**
 * Visit-level fields stored as top-level columns on `statements`, never in a
 * template. Driven by the `common` flag on the field definitions, unioned with
 * the three column-backed ids so a definition that forgets the flag still can't
 * leak patient data into a permanent row.
 */
const COLUMN_BACKED_COMMON_IDS = ['patient_name', 'patient_birth_year', 'visit_date'];

export function commonFieldIds(formId: string): Set<string> {
  const ids = new Set(COLUMN_BACKED_COMMON_IDS);
  for (const f of formFields(formId)) {
    if (f.common === true) ids.add(f.id);
  }
  return ids;
}

/** A field whose value belongs to the protocol rather than to the patient. */
export function templatableFieldIds(formId: string): FormField[] {
  const common = commonFieldIds(formId);
  return formFields(formId).filter(
    (f) => !common.has(f.id) && f.sensitive !== true && f.type !== 'calculated'
  );
}

/** The value an unfilled field of this type should carry inside a template. */
function emptyValueFor(field: FormField): unknown {
  return field.type === 'boolean' ? false : '';
}

/**
 * Build the payload stored in `form_templates.form_data`.
 *
 * Covers EVERY templatable field of the form, including the empty ones — that
 * is what makes applying a template a true replace rather than a merge, so
 * switching from T02 back to T01 clears whatever T02 had set.
 *
 * Drops, unconditionally: common/patient fields, fields flagged `sensitive`
 * (identifiers such as Personas kods), calculated fields, and any key that is
 * not part of the form definition. Runs server-side so a bad client cannot
 * persist patient data into a row that outlives the 12h purge window.
 */
export function sanitizeTemplateData(
  formId: string,
  data: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = data ?? {};
  const out: Record<string, unknown> = {};
  for (const field of templatableFieldIds(formId)) {
    const raw = source[field.id];
    out[field.id] = raw === undefined || raw === null ? emptyValueFor(field) : raw;
  }
  return out;
}

/**
 * Values to write into a live form when a template is applied. Keys unknown to
 * the current form definition are dropped (definition drift), and patient
 * fields can never come back in — which also means applying a template never
 * clears an identifier the doctor has already typed.
 */
export function applicableTemplateValues(
  formId: string,
  formData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = formData ?? {};
  const out: Record<string, unknown> = {};
  for (const field of templatableFieldIds(formId)) {
    if (field.id in source) out[field.id] = source[field.id];
  }
  return out;
}

/** Trim an optional label to what the column and the button can hold. */
export function normalizeLabel(label: unknown): string | null {
  if (label === undefined || label === null) return null;
  const trimmed = String(label).trim().slice(0, 24);
  return trimmed.length ? trimmed : null;
}
