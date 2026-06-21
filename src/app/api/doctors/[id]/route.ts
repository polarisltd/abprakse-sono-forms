import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT id, name, avatar, form_ids, active, created_at::text
      FROM doctors WHERE id = ${id}
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
    const { name, avatar, form_ids, active } = await request.json();
    const rows = await sql`
      UPDATE doctors SET
        name     = COALESCE(${name ?? null}, name),
        avatar   = COALESCE(${avatar ?? null}, avatar),
        form_ids = COALESCE(${form_ids ?? null}, form_ids),
        active   = COALESCE(${active ?? null}, active)
      WHERE id = ${id}
      RETURNING id, name, avatar, form_ids, active, created_at::text
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    await sql`UPDATE doctors SET active = false WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
