import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { FORM_MAP } from '@/lib/form-definitions';
import {
  MAX_TEMPLATE_SLOTS,
  normalizeLabel,
  sanitizeTemplateData,
  slotCode,
} from '@/lib/templates';
import { FormTemplate } from '@/lib/types';

export const dynamic = 'force-dynamic';

type TemplateRow = Omit<FormTemplate, 'code'>;

function withCode(row: TemplateRow): FormTemplate {
  return { ...row, code: slotCode(row.slot) };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const formId = searchParams.get('form_id');

  if (!formId || !FORM_MAP[formId]) {
    return NextResponse.json({ error: 'Unknown or missing form_id' }, { status: 400 });
  }

  const sql = getDb();
  try {
    const rows = await sql`
      SELECT id, form_id, slot, label, form_data, created_by, updated_at::text
      FROM form_templates
      WHERE form_id = ${formId}
      ORDER BY slot
    `;
    return NextResponse.json((rows as TemplateRow[]).map(withCode));
  } catch (err) {
    console.error('GET /api/templates error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** Postgres unique_violation — another doctor took the slot in the same instant. */
function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  if (code !== undefined && String(code) === '23505') return true;
  return /duplicate key value|form_templates_form_slot_uniq/i.test(String(err));
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  try {
    const body = await request.json();
    const { form_id, form_data, label, created_by } = body;

    if (!form_id || !FORM_MAP[form_id]) {
      return NextResponse.json({ error: 'Unknown or missing form_id' }, { status: 400 });
    }

    const safeData = JSON.stringify(sanitizeTemplateData(form_id, form_data));
    const safeLabel = normalizeLabel(label);
    const safeCreatedBy =
      created_by != null && created_by !== '' ? parseInt(String(created_by), 10) || null : null;

    // Lowest free slot + insert in ONE statement: the neon serverless HTTP
    // driver runs a single statement per round trip with no transaction across
    // calls, so a read-then-insert pair would race. The unique constraint is
    // the backstop; on a collision we simply try again and land on the next
    // free slot.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const rows = await sql`
          WITH free AS (
            SELECT gs AS slot
            FROM generate_series(1, ${MAX_TEMPLATE_SLOTS}::int) gs
            WHERE NOT EXISTS (
              SELECT 1 FROM form_templates t
              WHERE t.form_id = ${form_id}::varchar AND t.slot = gs
            )
            ORDER BY gs
            LIMIT 1
          )
          INSERT INTO form_templates (form_id, slot, label, form_data, created_by)
          SELECT ${form_id}::varchar, free.slot, ${safeLabel}::varchar,
                 ${safeData}::jsonb, ${safeCreatedBy}::int
          FROM free
          RETURNING id, form_id, slot, label, form_data, created_by, updated_at::text
        `;

        if (!rows.length) {
          return NextResponse.json(
            { error: 'SLOTS_FULL', max: MAX_TEMPLATE_SLOTS },
            { status: 409 }
          );
        }
        return NextResponse.json(withCode(rows[0] as TemplateRow), { status: 201 });
      } catch (err) {
        if (!isUniqueViolation(err) || attempt === 2) throw err;
      }
    }

    return NextResponse.json({ error: 'SLOTS_FULL', max: MAX_TEMPLATE_SLOTS }, { status: 409 });
  } catch (err) {
    console.error('POST /api/templates error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
