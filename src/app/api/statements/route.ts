import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const sql = getDb();

  try {
    const rows = await sql`
      SELECT
        s.id,
        s.doc_id,
        s.form_id,
        s.visit_date::text,
        s.doctor_id,
        d.name AS doctor_name,
        s.patient_name,
        s.patient_birth_year,
        s.form_data,
        s.is_complete,
        s.created_at::text,
        s.updated_at::text
      FROM statements s
      LEFT JOIN doctors d ON d.id = s.doctor_id
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
    const { form_id, doctor_id, visit_date, patient_name, patient_birth_year, form_data } = body;

    const result = await sql`
      SELECT LPAD((COALESCE(MAX(doc_id::integer), 0) + 1)::text, 6, '0') AS next_id
      FROM statements
    `;
    const doc_id = result[0].next_id as string;

    const rows = await sql`
      INSERT INTO statements (doc_id, form_id, doctor_id, visit_date, patient_name, patient_birth_year, form_data)
      VALUES (
        ${doc_id},
        ${form_id},
        ${doctor_id ?? null},
        ${visit_date ?? new Date().toISOString().slice(0, 10)},
        ${patient_name ?? null},
        ${patient_birth_year ?? null},
        ${JSON.stringify(form_data ?? {})}
      )
      RETURNING
        id, doc_id, form_id, visit_date::text, doctor_id, patient_name, patient_birth_year,
        form_data, is_complete, created_at::text, updated_at::text
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/statements error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
