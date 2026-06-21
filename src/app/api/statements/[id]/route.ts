import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT
        s.id, s.doc_id, s.form_id, s.visit_date::text, s.doctor_id,
        d.name AS doctor_name,
        s.patient_name, s.patient_birth_year,
        s.form_data, s.is_complete, s.created_at::text, s.updated_at::text
      FROM statements s
      LEFT JOIN doctors d ON d.id = s.doctor_id
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
    const { patient_name, patient_birth_year, visit_date, form_data, is_complete } = body;

    const rows = await sql`
      UPDATE statements SET
        patient_name       = COALESCE(${patient_name ?? null}, patient_name),
        patient_birth_year = COALESCE(${patient_birth_year ?? null}, patient_birth_year),
        visit_date         = COALESCE(${visit_date ?? null}::date, visit_date),
        form_data          = COALESCE(${form_data != null ? JSON.stringify(form_data) : null}::jsonb, form_data),
        is_complete        = COALESCE(${is_complete ?? null}, is_complete),
        updated_at         = NOW()
      WHERE id = ${id}
      RETURNING
        id, doc_id, form_id, visit_date::text, doctor_id, patient_name, patient_birth_year,
        form_data, is_complete, created_at::text, updated_at::text
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/statements/[id] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
