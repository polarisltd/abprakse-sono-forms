export interface Doctor {
  id: number;
  name: string;
  avatar: string;
  form_ids: string[];
  active: boolean;
  created_at: string;
}

export interface Statement {
  id: number;
  doc_id: string;
  /** NULL on a rich-text document row (see template_id). */
  form_id: string | null;
  visit_date: string;
  doctor_id: number | null;
  doctor_name?: string;
  patient_name: string | null;
  patient_birth_year: number | null;
  form_data: Record<string, unknown>;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
  /** Set only on a rich-text document row — see DocTemplate. */
  template_id: number | null;
  /** Snapshot of doc_templates.name at creation time; survives rename/delete. */
  template_name: string | null;
  /** The document's editable rich-text body. NULL for structured forms. */
  body_html: string | null;
  /** Durable link into the patient roster. NULL for structured forms. */
  patient_id: number | null;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'select'
  | 'toggle'
  | 'date'
  | 'year'
  | 'calculated';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  lines?: number;
  unit?: string;
  common?: boolean;
  /**
   * Patient-identifying. Saved on the statement like any other field (and so
   * purged with it after 12h), but never written into a template, which is
   * permanent. Use this for identifiers that are not top-level columns.
   */
  sensitive?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  calcFrom?: string[];
}

export interface FormRow {
  fields: FormField[];
}

export interface FormSection {
  id: string;
  title?: string;
  note?: string;
  noteBold?: boolean;
  /** Font size for `note`, e.g. '1.2rem'. Defaults to the ambient text-xs size. */
  noteFontSize?: string;
  rows: FormRow[];
}

export interface FormDef {
  id: string;
  title: string;
  subtitle?: string;
  avatar: string;
  sections: FormSection[];
}

/** An admin-authored rich-text document template — see DocumentRenderer. */
export interface DocTemplate {
  id: number;
  name: string;
  /** Display id derived server-side from `id` — 'T001', 'T002', … — the same
   *  value a doctor's `form_ids` holds to assign this template explicitly. */
  code: string;
  body_html: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** A roster entry, persistent (not purged with its statements). */
export interface Patient {
  id: number;
  name: string;
  birth_year: number | null;
  personal_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormTemplate {
  id: number;
  form_id: string;
  slot: number;
  /** Display name derived from `slot` server-side: 'T01'. */
  code: string;
  label: string | null;
  form_data: Record<string, unknown>;
  created_by: number | null;
  updated_at: string;
}
