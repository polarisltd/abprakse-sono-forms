import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const sql = getDb();

    await sql`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        title VARCHAR(100) NOT NULL DEFAULT 'Ārsts',
        avatar VARCHAR(10) NOT NULL DEFAULT '👤',
        form_ids TEXT[] NOT NULL DEFAULT '{}',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Shown before the doctor's name on printed documents ('Pediatrs: …').
    // NOT NULL with a default so a doctor never prints with an empty title.
    await sql`ALTER TABLE doctors ADD COLUMN IF NOT EXISTS title VARCHAR(100) NOT NULL DEFAULT 'Ārsts'`;

    await sql`
      CREATE TABLE IF NOT EXISTS statements (
        id SERIAL PRIMARY KEY,
        doc_id VARCHAR(6) NOT NULL UNIQUE,
        form_id VARCHAR(5) NOT NULL,
        visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
        doctor_id INTEGER REFERENCES doctors(id),
        patient_name VARCHAR(255),
        patient_birth_year INTEGER,
        form_data JSONB NOT NULL DEFAULT '{}',
        is_complete BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS form_templates (
        id SERIAL PRIMARY KEY,
        form_id VARCHAR(5) NOT NULL,
        slot SMALLINT NOT NULL,
        label VARCHAR(24),
        form_data JSONB NOT NULL DEFAULT '{}',
        created_by INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT form_templates_slot_range CHECK (slot BETWEEN 1 AND 12),
        CONSTRAINT form_templates_form_slot_uniq UNIQUE (form_id, slot)
      )
    `;

    // Rich-text document templates (admin-authored) and the feature's own
    // persistent patient roster — see specs/feature-document-templates.md.
    await sql`
      CREATE TABLE IF NOT EXISTS doc_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        body_html TEXT NOT NULL DEFAULT '',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Admin-chosen display name override for a structured form (F00x), used
    // only in pickers/lists — the printed statement always keeps the form's
    // regulated title from form-definitions.ts.
    await sql`
      CREATE TABLE IF NOT EXISTS form_labels (
        form_id VARCHAR(5) PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        birth_year INTEGER,
        personal_code VARCHAR(32),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // `statements` grows four nullable columns so a rich-text document is
    // just a statement row with these set and form_id/form_data unused —
    // see specs/feature-document-templates.md §4.3. Existing rows are
    // untouched; form_id only needs to accept NULL going forward.
    await sql`ALTER TABLE statements ALTER COLUMN form_id DROP NOT NULL`;
    await sql`ALTER TABLE statements ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES doc_templates(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE statements ADD COLUMN IF NOT EXISTS template_name VARCHAR(100)`;
    await sql`ALTER TABLE statements ADD COLUMN IF NOT EXISTS body_html TEXT`;
    await sql`ALTER TABLE statements ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL`;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_statements_visit_date ON statements(visit_date)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_statements_created_at ON statements(created_at DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_form_templates_form ON form_templates(form_id, slot)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (lower(name))
    `;

    const existing = await sql`SELECT COUNT(*) AS count FROM doctors`;
    if (Number(existing[0].count) === 0) {
      await sql`
        INSERT INTO doctors (name, avatar, form_ids) VALUES
          ('Ārsts 1', '👩‍⚕️', ARRAY['F001','F004','F005','F007','F009','F010']),
          ('Ārsts 2', '👨‍⚕️', ARRAY['F002','F003','F006','F008']),
          ('Ārsts 3', '🩺', ARRAY['F001','F002','F003','F004','F005','F006','F007','F008','F009','F010'])
      `;
    }

    return NextResponse.json({ ok: true, message: 'Datubāze inicializēta' });
  } catch (err) {
    console.error('DB init error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
