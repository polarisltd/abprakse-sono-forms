'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { FORM_MAP, PRACTICE } from '@/lib/form-definitions';
import { Statement } from '@/lib/types';
import FormRenderer from '@/components/FormRenderer';
import PrintView from '@/components/PrintView';
import Link from 'next/link';

export default function FormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.formId as string;
  const statementId = searchParams.get('id');

  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  // Single print ref — always points to the one PrintView in the DOM
  const printRef = useRef<HTMLDivElement>(null);

  const formDef = FORM_MAP[formId];

  useEffect(() => {
    if (!statementId) return;
    fetch(`/api/statements/${statementId}`)
      .then((r) => r.json())
      .then((data: Statement) => {
        setStatement(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statementId]);

  // Called by FormRenderer after every successful field save
  const handleSaved = (updated: Statement) => {
    setStatement(updated);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `US_${statement?.doc_id ?? ''}`,
  });

  const handleComplete = async () => {
    if (!statement) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/statements/${statement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: true }),
      });
      if (res.ok) {
        const updated: Statement = await res.json();
        setStatement(updated);
        setDone(true);
      }
    } finally {
      setCompleting(false);
    }
  };

  if (!formDef) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Nezināma veidlapa: {formId}
      </div>
    );
  }

  if (!statementId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Trūkst ieraksta ID
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Ielādē veidlapu...</div>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Ieraksts nav atrasts
      </div>
    );
  }

  const initialData: Record<string, unknown> = {
    ...((statement.form_data as Record<string, unknown>) ?? {}),
    patient_name: statement.patient_name ?? '',
    patient_birth_year: statement.patient_birth_year ?? '',
    visit_date: statement.visit_date ?? new Date().toISOString().slice(0, 10),
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-semibold text-gray-700">Veidlapa pabeigta</h2>
        <p className="text-gray-500">Nr. {statement.doc_id}</p>
        <div className="flex gap-4">
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            🖨 Drukāt / PDF
          </button>
          <Link
            href="/doctor"
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Jauna veidlapa
          </Link>
        </div>
        {/* Single PrintView for the done screen */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PrintView ref={printRef} formDef={formDef} statement={statement} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="no-print bg-white border-b shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/doctor" className="text-blue-500 hover:underline text-sm">
            ← Atpakaļ
          </Link>
          <span className="text-lg">{formDef.avatar}</span>
          <div>
            <div className="font-semibold text-gray-800">{formDef.title}</div>
            {formDef.subtitle && (
              <div className="text-xs text-gray-500">{formDef.subtitle}</div>
            )}
          </div>
          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
            Nr. {statement.doc_id}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            🖨 Drukāt / PDF
          </button>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {completing ? 'Saglabā...' : '✓ Pabeigt'}
          </button>
        </div>
      </div>

      {/* Practice header */}
      <div className="bg-blue-700 text-white text-center py-2 text-sm no-print">
        {PRACTICE.name} · {PRACTICE.address} · Tel. {PRACTICE.phone}
      </div>

      {/* Form content */}
      <div className="max-w-3xl mx-auto p-6">
        <FormRenderer
          formDef={formDef}
          statementId={statement.id}
          initialData={initialData}
          onSaved={handleSaved}
        />
      </div>

      {/* Single PrintView — off-screen so react-to-print can clone it */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <PrintView ref={printRef} formDef={formDef} statement={statement} />
      </div>
    </div>
  );
}
