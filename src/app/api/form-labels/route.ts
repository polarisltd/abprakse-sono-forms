import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  const sql = getDb();
  try {
    const rows = await sql`
      SELECT form_id, label, updated_at::text
      FROM form_labels
      ORDER BY form_id
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/form-labels error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
