import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sanitizeRichText } from '@/lib/sanitize-html';
import { docTemplateCode } from '@/lib/doc-templates';

export const dynamic = 'force-dynamic';

type Row = { id: number; name: string; body_html: string; active: boolean };
const withCode = <T extends Row>(row: T) => ({ ...row, code: docTemplateCode(row.id) });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';
  const sql = getDb();

  try {
    const rows = activeOnly
      ? await sql`
          SELECT id, name, body_html, active, created_at::text, updated_at::text
          FROM doc_templates
          WHERE active
          ORDER BY name
        `
      : await sql`
          SELECT id, name, body_html, active, created_at::text, updated_at::text
          FROM doc_templates
          ORDER BY name
        `;
    return NextResponse.json((rows as Row[]).map(withCode));
  } catch (err) {
    console.error('GET /api/doc-templates error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim().slice(0, 100);
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const bodyHtml = sanitizeRichText(body.body_html ?? '');

    const rows = await sql`
      INSERT INTO doc_templates (name, body_html)
      VALUES (${name}, ${bodyHtml})
      RETURNING id, name, body_html, active, created_at::text, updated_at::text
    `;
    return NextResponse.json(withCode(rows[0] as Row), { status: 201 });
  } catch (err) {
    console.error('POST /api/doc-templates error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
