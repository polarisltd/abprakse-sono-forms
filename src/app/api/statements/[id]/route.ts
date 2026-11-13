import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sanitizeRichText } from '@/lib/sanitize-html';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT
        s.id, s.doc_id, s.form_id, s.visit_date::text, s.doctor_id,
        d.name AS doctor_name,
        d.title AS doctor_title,
        COALESCE(s.patient_name, p.name) AS patient_name,
        COALESCE(s.patient_birth_year, p.birth_year) AS patient_birth_year,
        s.form_data, s.is_complete, s.created_at::text, s.updated_at::text,
        s.template_id, s.template_name, s.body_html, s.patient_id
      FROM statements s
      LEFT JOIN doctors d ON d.id = s.doctor_id
      LEFT JOIN patients p ON p.id = s.patient_id
      WHERE s.id = ${id}
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    const body = await request.json();
    const { patient_name, patient_birth_year, visit_date, form_data, is_complete, body_html } = body;

    // Coerce empty strings to null; parse birth year as integer
    const safeName = (patient_name !== '' && patient_name != null) ? String(patient_name) : null;
    const safeBirthYear = (patient_birth_year !== '' && patient_birth_year != null)
      ? parseInt(String(patient_birth_year), 10) || null
      : null;
    const safeDate = (visit_date !== '' && visit_date != null) ? String(visit_date) : null;
    const safeComplete = is_complete != null ? Boolean(is_complete) : null;
    const safeBodyHtml = body_html != null ? sanitizeRichText(body_html) : null;

    const updated = await sql`
      UPDATE statements SET
        patient_name       = COALESCE(${safeName}, patient_name),
        patient_birth_year = COALESCE(${safeBirthYear}, patient_birth_year),
        visit_date         = COALESCE(${safeDate}::date, visit_date),
        form_data          = COALESCE(${form_data != null ? JSON.stringify(form_data) : null}::jsonb, form_data),
        is_complete        = COALESCE(${safeComplete}, is_complete),
        body_html          = COALESCE(${safeBodyHtml}, body_html),
        updated_at         = NOW()
      WHERE id = ${id}
      RETURNING id
    `;
    if (!updated.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Re-fetched with the doctor/patient joins (not available inside a plain
    // UPDATE ... RETURNING) so a document's patient_name/doctor_name — which
    // resolve from patient_id/doctor_id, not stored columns — survive every
    // autosave the same way GET already returns them.
    const rows = await sql`
      SELECT
        s.id, s.doc_id, s.form_id, s.visit_date::text, s.doctor_id,
        d.name AS doctor_name,
        d.title AS doctor_title,
        COALESCE(s.patient_name, p.name) AS patient_name,
        COALESCE(s.patient_birth_year, p.birth_year) AS patient_birth_year,
        s.form_data, s.is_complete, s.created_at::text, s.updated_at::text,
        s.template_id, s.template_name, s.body_html, s.patient_id
      FROM statements s
      LEFT JOIN doctors d ON d.id = s.doctor_id
      LEFT JOIN patients p ON p.id = s.patient_id
      WHERE s.id = ${updated[0].id}
    `;
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/statements/[id] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Discards a visit opened by mistake. Only an unfinished visit can go — a
// completed one is a finished record and is refused here, whatever the UI shows.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    const deleted = await sql`
      DELETE FROM statements WHERE id = ${id} AND NOT is_complete RETURNING id
    `;
    if (deleted.length) return NextResponse.json({ ok: true });

    const existing = await sql`SELECT id FROM statements WHERE id = ${id}`;
    if (!existing.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Completed visits cannot be deleted' }, { status: 409 });
  } catch (err) {
    console.error('DELETE /api/statements/[id] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
