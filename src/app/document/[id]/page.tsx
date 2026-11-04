'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { PRACTICE } from '@/lib/form-definitions';
import { Statement } from '@/lib/types';
import DocumentRenderer from '@/components/DocumentRenderer';
import DocumentPrintView from '@/components/DocumentPrintView';
import Link from 'next/link';

export default function DocumentPage() {
  const params = useParams();
  const statementId = params.id as string;

  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/statements/${statementId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Statement | null) => {
        setStatement(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statementId]);

  const handleSaved = (updated: Statement) => setStatement(updated);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Ielādē dokumentu...</div>
      </div>
    );
  }

  if (!statement || statement.template_id == null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Dokuments nav atrasts
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-semibold text-gray-700">Dokuments pabeigts</h2>
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
            Jauns dokuments
          </Link>
        </div>
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <DocumentPrintView ref={printRef} statement={statement} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white border-b shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/doctor" className="text-blue-500 hover:underline text-sm">
            ← Atpakaļ
          </Link>
          <span className="text-lg">📝</span>
          <div>
            <div className="font-semibold text-gray-800">{statement.template_name}</div>
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

      <div className="bg-blue-700 text-white text-center py-2 text-sm no-print">
        {PRACTICE.name} · {PRACTICE.address} · Tel. {PRACTICE.phone}
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <DocumentRenderer
          statement={statement}
          onSaved={handleSaved}
          readOnly={statement.is_complete}
        />
      </div>

      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <DocumentPrintView ref={printRef} statement={statement} />
      </div>
    </div>
  );
}
