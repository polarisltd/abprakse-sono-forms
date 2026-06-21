'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Statement } from '@/lib/types';
import { FORM_MAP } from '@/lib/form-definitions';
import PrintView from '@/components/PrintView';
import Link from 'next/link';

function dateOffset(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export default function MidwifePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [printTarget, setPrintTarget] = useState<Statement | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/statements?date=${d}`);
      const data = await res.json();
      setStatements(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
    const interval = setInterval(() => load(date), 15000);
    return () => clearInterval(interval);
  }, [date, load]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `US_${printTarget?.doc_id ?? ''}`,
    onAfterPrint: () => setPrintTarget(null),
  });

  useEffect(() => {
    if (printTarget) {
      const timer = setTimeout(() => handlePrint(), 100);
      return () => clearTimeout(timer);
    }
  }, [printTarget, handlePrint]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-blue-500 hover:underline text-sm">
            ← Sākums
          </Link>
          <h1 className="text-xl font-bold text-gray-800">📋 Māsītes skats</h1>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate((d) => dateOffset(d, -1))}
            className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
          >
            ‹
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          />
          <button
            onClick={() => setDate((d) => dateOffset(d, 1))}
            className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
          >
            ›
          </button>
          <button
            onClick={() => setDate(today)}
            className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm"
          >
            Šodien
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-600 font-medium">
            {fmtDate(date)} — {statements.length} ierakst{statements.length === 1 ? 's' : 'i'}
          </h2>
          {loading && <span className="text-xs text-gray-400 animate-pulse">Atjaunina...</span>}
        </div>

        {statements.length === 0 && !loading ? (
          <div className="text-center text-gray-400 py-20">
            <div className="text-4xl mb-3">📭</div>
            <p>Nav ierakstu šai datumā</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium w-24">Nr.</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Pacients</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Dz. g.</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Veidlapa</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Ārsts</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Laiks</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Statuss</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statements.map((s) => {
                  const form = FORM_MAP[s.form_id];
                  const createdAt = new Date(s.created_at);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-gray-500">{s.doc_id}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {s.patient_name || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.patient_birth_year || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span>{form?.avatar ?? '📄'}</span>
                          <span className="text-gray-700">{form?.title ?? s.form_id}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.doctor_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {createdAt.toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        {s.is_complete ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Pabeigts
                          </span>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            Aizpilda
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setPrintTarget(s)}
                          className="text-xs text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50"
                        >
                          🖨 Drukāt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hidden print target */}
      <div style={{ display: 'none' }}>
        {printTarget && FORM_MAP[printTarget.form_id] && (
          <PrintView
            ref={printRef}
            formDef={FORM_MAP[printTarget.form_id]}
            statement={printTarget}
          />
        )}
      </div>
    </div>
  );
}
