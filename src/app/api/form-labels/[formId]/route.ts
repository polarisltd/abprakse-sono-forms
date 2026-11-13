import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { FORM_MAP } from '@/lib/form-definitions';
import { requireSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { formId } = await params;
  if (!FORM_MAP[formId]) {
    return NextResponse.json({ error: 'Unknown form_id' }, { status: 404 });
  }
  const sql = getDb();
  try {
    const body = await request.json();
    const label = String(body.label ?? '').trim().slice(0, 100);
    if (!label) {
      // Empty label means "use the default title" — same as DELETE.
      await sql`DELETE FROM form_labels WHERE form_id = ${formId}`;
      return NextResponse.json({ form_id: formId, label: null });
    }

    const rows = await sql`
      INSERT INTO form_labels (form_id, label)
      VALUES (${formId}, ${label})
      ON CONFLICT (form_id) DO UPDATE SET label = EXCLUDED.label, updated_at = NOW()
      RETURNING form_id, label, updated_at::text
    `;
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/form-labels/[formId] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { formId } = await params;
  const sql = getDb();
  try {
    await sql`DELETE FROM form_labels WHERE form_id = ${formId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/form-labels/[formId] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
