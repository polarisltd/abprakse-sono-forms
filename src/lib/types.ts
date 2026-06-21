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
  form_id: string;
  visit_date: string;
  doctor_id: number | null;
  doctor_name?: string;
  patient_name: string | null;
  patient_birth_year: number | null;
  form_data: Record<string, unknown>;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'select'
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
  rows: FormRow[];
}

export interface FormDef {
  id: string;
  title: string;
  subtitle?: string;
  avatar: string;
  sections: FormSection[];
}
