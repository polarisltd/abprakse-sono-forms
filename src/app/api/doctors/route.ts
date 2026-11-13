import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizeDoctorTitle } from '@/lib/doctor-title';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT id, name, title, avatar, form_ids, active, created_at::text
      FROM doctors
      WHERE active = true
      ORDER BY id
    `;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  try {
    const { name, title, avatar, form_ids } = await request.json();
    const rows = await sql`
      INSERT INTO doctors (name, title, avatar, form_ids)
      VALUES (${name}, ${normalizeDoctorTitle(title)}, ${avatar ?? '👤'}, ${form_ids ?? []})
      RETURNING id, name, title, avatar, form_ids, active, created_at::text
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
