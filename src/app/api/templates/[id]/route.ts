import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizeLabel, sanitizeTemplateData, slotCode } from '@/lib/templates';
import { FormTemplate } from '@/lib/types';

export const dynamic = 'force-dynamic';

type TemplateRow = Omit<FormTemplate, 'code'>;

function withCode(row: TemplateRow): FormTemplate {
  return { ...row, code: slotCode(row.slot) };
}

/**
 * Overwrite a slot's data and/or rename it.
 *
 * `slot` is immutable on purpose: a doctor who remembers "T03 is the twin
 * pregnancy one" must keep that true, so changing the content never renumbers.
 *
 * Last write wins. With practice-wide scope and at most 12 slots, optimistic
 * locking would raise a conflict screen far more often than it would prevent a
 * real loss; `updated_at` comes back so the UI can show when it last changed.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    const body = await request.json();

    const existing = await sql`SELECT form_id FROM form_templates WHERE id = ${id}`;
    if (!existing.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const formId = existing[0].form_id as string;

    const dataProvided = body.form_data != null;
    const safeData = dataProvided
      ? JSON.stringify(sanitizeTemplateData(formId, body.form_data))
      : null;

    // A label can be cleared, so "absent" and "null" must stay distinguishable —
    // COALESCE alone would read a deliberate clear as "leave unchanged".
    const labelProvided = Object.prototype.hasOwnProperty.call(body, 'label');
    const safeLabel = labelProvided ? normalizeLabel(body.label) : null;

    const rows = await sql`
      UPDATE form_templates SET
        form_data  = COALESCE(${safeData}::jsonb, form_data),
        label      = CASE WHEN ${labelProvided}::boolean THEN ${safeLabel}::varchar ELSE label END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, form_id, slot, label, form_data, created_by, updated_at::text
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(withCode(rows[0] as TemplateRow));
  } catch (err) {
    console.error('PUT /api/templates/[id] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * Delete a slot and hand the full payload back, so the client can hold it in
 * memory and re-POST it if the doctor taps "Atsaukt" within the undo window.
 * If the freed slot gets claimed in those few seconds the restore simply lands
 * on the next free one — no reservation, no tombstone table.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  try {
    const rows = await sql`
      DELETE FROM form_templates
      WHERE id = ${id}
      RETURNING id, form_id, slot, label, form_data, created_by, updated_at::text
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ deleted: withCode(rows[0] as TemplateRow) });
  } catch (err) {
    console.error('DELETE /api/templates/[id] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
