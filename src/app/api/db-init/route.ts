import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const sql = getDb();

    await sql`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        avatar VARCHAR(10) NOT NULL DEFAULT '👤',
        form_ids TEXT[] NOT NULL DEFAULT '{}',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS statements (
        id SERIAL PRIMARY KEY,
        doc_id VARCHAR(6) NOT NULL UNIQUE,
        form_id VARCHAR(5) NOT NULL,
        visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
        doctor_id INTEGER REFERENCES doctors(id),
        patient_name VARCHAR(255),
        patient_birth_year INTEGER,
        form_data JSONB NOT NULL DEFAULT '{}',
        is_complete BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_statements_visit_date ON statements(visit_date)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_statements_created_at ON statements(created_at DESC)
    `;

    const existing = await sql`SELECT COUNT(*) AS count FROM doctors`;
    if (Number(existing[0].count) === 0) {
      await sql`
        INSERT INTO doctors (name, avatar, form_ids) VALUES
          ('Ārsts 1', '👩‍⚕️', ARRAY['F001','F004','F005','F007','F009','F010']),
          ('Ārsts 2', '👨‍⚕️', ARRAY['F002','F003','F006','F008']),
          ('Ārsts 3', '🩺', ARRAY['F001','F002','F003','F004','F005','F006','F007','F008','F009','F010'])
      `;
    }

    return NextResponse.json({ ok: true, message: 'Datubāze inicializēta' });
  } catch (err) {
    console.error('DB init error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
