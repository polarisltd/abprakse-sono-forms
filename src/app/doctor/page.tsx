'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Doctor } from '@/lib/types';
import { FORM_MAP } from '@/lib/form-definitions';

export default function DoctorPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Doctor | null>(null);

  useEffect(() => {
    fetch('/api/doctors')
      .then((r) => r.json())
      .then((data) => {
        setDoctors(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Ielādē...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-blue-500 hover:underline text-sm">
            ← Atpakaļ
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Izvēlieties ārstu</h1>
        </div>

        {!selected ? (
          <>
            {doctors.length === 0 ? (
              <div className="text-center text-gray-400 py-20">
                <div className="text-4xl mb-3">😕</div>
                <p>Nav konfigurētu ārstu.</p>
                <Link href="/admin" className="text-blue-500 underline mt-2 inline-block">
                  Pievienot ārstus administrēšanā
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {doctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelected(doc)}
                    className="flex flex-col items-center gap-3 bg-white rounded-2xl shadow p-6 hover:shadow-md hover:-translate-y-0.5 transition-all border border-transparent hover:border-blue-200"
                  >
                    <span className="text-5xl">{doc.avatar}</span>
                    <span className="font-medium text-gray-700 text-sm text-center">{doc.name}</span>
                    <span className="text-xs text-gray-400">
                      {doc.form_ids.length} veidlap{doc.form_ids.length === 1 ? 'a' : 'as'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setSelected(null)}
                className="text-blue-500 hover:underline text-sm"
              >
                ← Mainīt ārstu
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selected.avatar}</span>
                <h2 className="font-semibold text-gray-700">{selected.name}</h2>
              </div>
            </div>

            <h3 className="text-gray-600 mb-4 font-medium">Izvēlieties veidlapu:</h3>

            {selected.form_ids.length === 0 ? (
              <p className="text-gray-400">Šim ārstam nav piešķirtu veidlapu.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selected.form_ids.map((fid) => {
                  const form = FORM_MAP[fid];
                  if (!form) return null;
                  return (
                    <StartFormButton
                      key={fid}
                      doctorId={selected.id}
                      formId={fid}
                      avatar={form.avatar}
                      title={form.title}
                      subtitle={form.subtitle}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function StartFormButton({
  doctorId,
  formId,
  avatar,
  title,
  subtitle,
}: {
  doctorId: number;
  formId: string;
  avatar: string;
  title: string;
  subtitle?: string;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          doctor_id: doctorId,
          visit_date: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const statement = await res.json();
      window.location.href = `/form/${formId}?id=${statement.id}`;
    } catch (err) {
      setError(String(err));
      setCreating(false);
    }
  };

  return (
    <button
      onClick={handleStart}
      disabled={creating}
      className="flex flex-col items-center gap-3 bg-white rounded-2xl shadow p-6 hover:shadow-md hover:-translate-y-0.5 transition-all border border-transparent hover:border-blue-200 disabled:opacity-50"
    >
      <span className="text-5xl">{avatar}</span>
      <div className="text-center">
        <div className="font-medium text-gray-700 text-sm">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
        <div className="text-xs text-blue-400 mt-1">{formId}</div>
      </div>
      {creating && <span className="text-xs text-gray-400 animate-pulse">Atvērt...</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </button>
  );
}
