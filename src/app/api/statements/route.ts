import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sanitizeRichText } from '@/lib/sanitize-html';

export const dynamic = 'force-dynamic';

// Shared by every route below: a document's patient_name/patient_birth_year
// are never written directly (only patient_id is) — they resolve from the
// roster via this join, same pattern doctor_name already uses for doctors.
// See specs/feature-document-templates.md §4.3.
const SELECT_COLUMNS = `
  s.id,
  s.doc_id,
  s.form_id,
  s.visit_date::text,
  s.doctor_id,
  d.name AS doctor_name,
  d.title AS doctor_title,
  COALESCE(s.patient_name, p.name) AS patient_name,
  COALESCE(s.patient_birth_year, p.birth_year) AS patient_birth_year,
  s.form_data,
  s.is_complete,
  s.created_at::text,
  s.updated_at::text,
  s.template_id,
  s.template_name,
  s.body_html,
  s.patient_id
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const sql = getDb();

  try {
    // A doctor's unfinished visits, across all dates — the grid in the
    // doctor's area, where a nurse-prepared visit waits until someone
    // completes it.
    const doctorParam = searchParams.get('doctor_id');
    if (doctorParam != null) {
      const doctorId = Number(doctorParam);
      if (!Number.isInteger(doctorId)) {
        return NextResponse.json({ error: 'Invalid doctor_id' }, { status: 400 });
      }
      const rows = await sql`
        SELECT ${sql.unsafe(SELECT_COLUMNS)}
        FROM statements s
        LEFT JOIN doctors d ON d.id = s.doctor_id
        LEFT JOIN patients p ON p.id = s.patient_id
        WHERE s.doctor_id = ${doctorId} AND NOT s.is_complete
        ORDER BY s.created_at DESC
      `;
      return NextResponse.json(rows);
    }

    const rows = await sql`
      SELECT ${sql.unsafe(SELECT_COLUMNS)}
      FROM statements s
      LEFT JOIN doctors d ON d.id = s.doctor_id
      LEFT JOIN patients p ON p.id = s.patient_id
      WHERE s.visit_date = ${date}
      ORDER BY s.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/statements error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  try {
    const body = await request.json();
    const { form_id, doctor_id, visit_date, patient_name, patient_birth_year, form_data, template_id, patient_id } =
      body;

    const result = await sql`
      SELECT LPAD((COALESCE(MAX(doc_id::integer), 0) + 1)::text, 6, '0') AS next_id
      FROM statements
    `;
    const doc_id = result[0].next_id as string;
    const safeVisitDate = visit_date ?? new Date().toISOString().slice(0, 10);

    // A rich-text document: resolve the template, copy its body in, and
    // require patient_id — "choose or create patient" happens before this
    // call (PatientPicker), never after. See §6.5 of the design doc.
    if (template_id != null) {
      if (patient_id == null) {
        return NextResponse.json({ error: 'patient_id is required' }, { status: 400 });
      }
      const templateRows = await sql`
        SELECT id, name, body_html FROM doc_templates WHERE id = ${template_id} AND active
      `;
      if (!templateRows.length) {
        return NextResponse.json({ error: 'Unknown or inactive template_id' }, { status: 400 });
      }
      const template = templateRows[0] as { id: number; name: string; body_html: string };

      const rows = await sql`
        INSERT INTO statements (
          doc_id, form_id, doctor_id, visit_date, patient_id,
          template_id, template_name, body_html
        )
        VALUES (
          ${doc_id}, NULL, ${doctor_id ?? null}, ${safeVisitDate}, ${patient_id},
          ${template.id}, ${template.name}, ${sanitizeRichText(template.body_html)}
        )
        RETURNING id
      `;
      const created = await sql`
        SELECT ${sql.unsafe(SELECT_COLUMNS)}
        FROM statements s
        LEFT JOIN doctors d ON d.id = s.doctor_id
        LEFT JOIN patients p ON p.id = s.patient_id
        WHERE s.id = ${rows[0].id}
      `;
      return NextResponse.json(created[0], { status: 201 });
    }

    const rows = await sql`
      INSERT INTO statements (doc_id, form_id, doctor_id, visit_date, patient_name, patient_birth_year, form_data)
      VALUES (
        ${doc_id},
        ${form_id},
        ${doctor_id ?? null},
        ${safeVisitDate},
        ${patient_name ?? null},
        ${patient_birth_year ?? null},
        ${JSON.stringify(form_data ?? {})}
      )
      RETURNING
        id, doc_id, form_id, visit_date::text, doctor_id, patient_name, patient_birth_year,
        form_data, is_complete, created_at::text, updated_at::text,
        template_id, template_name, body_html, patient_id
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/statements error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
