import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sanitizeRichText } from '@/lib/sanitize-html';
import { docTemplateCode } from '@/lib/doc-templates';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    const body = await request.json();
    const safeName =
      body.name !== undefined && body.name !== null
        ? String(body.name).trim().slice(0, 100)
        : null;
    const safeBodyHtml =
      body.body_html !== undefined && body.body_html !== null
        ? sanitizeRichText(body.body_html)
        : null;
    const safeActive = body.active !== undefined && body.active !== null ? Boolean(body.active) : null;

    const rows = await sql`
      UPDATE doc_templates SET
        name       = COALESCE(${safeName}, name),
        body_html  = COALESCE(${safeBodyHtml}, body_html),
        active     = COALESCE(${safeActive}, active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, body_html, active, created_at::text, updated_at::text
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const row = rows[0] as { id: number };
    return NextResponse.json({ ...rows[0], code: docTemplateCode(row.id) });
  } catch (err) {
    console.error('PUT /api/doc-templates/[id] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    // ON DELETE SET NULL on statements.template_id — existing documents keep
    // their template_name snapshot and body_html untouched.
    const rows = await sql`DELETE FROM doc_templates WHERE id = ${id} RETURNING id`;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/doc-templates/[id] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
