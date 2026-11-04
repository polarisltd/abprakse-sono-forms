import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const sql = getDb();

  try {
    // Empty query returns the most recently added patients rather than
    // nothing, so the picker isn't blank the instant it opens.
    const rows = q
      ? await sql`
          SELECT id, name, birth_year, personal_code, created_at::text, updated_at::text
          FROM patients
          WHERE name ILIKE ${'%' + q + '%'}
          ORDER BY name
          LIMIT 10
        `
      : await sql`
          SELECT id, name, birth_year, personal_code, created_at::text, updated_at::text
          FROM patients
          ORDER BY updated_at DESC
          LIMIT 10
        `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/patients error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim().slice(0, 255);
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const birthYear =
      body.birth_year !== '' && body.birth_year != null
        ? parseInt(String(body.birth_year), 10) || null
        : null;
    const personalCode =
      body.personal_code !== '' && body.personal_code != null
        ? String(body.personal_code).trim().slice(0, 32)
        : null;

    const rows = await sql`
      INSERT INTO patients (name, birth_year, personal_code)
      VALUES (${name}, ${birthYear}, ${personalCode})
      RETURNING id, name, birth_year, personal_code, created_at::text, updated_at::text
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/patients error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
