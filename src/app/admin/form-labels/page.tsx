'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FORMS } from '@/lib/form-definitions';
import { FormLabel } from '@/lib/types';

export default function AdminFormLabelsPage() {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    fetch('/api/form-labels')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FormLabel[]) => {
        const map = Object.fromEntries(data.map((d) => [d.form_id, d.label]));
        setOverrides(map);
        setDrafts(map);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (formId: string) => {
    setSavingId(formId);
    const label = (drafts[formId] ?? '').trim();
    await fetch(`/api/form-labels/${formId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    setSavingId(null);
    load();
  };

  const handleReset = async (formId: string) => {
    setSavingId(formId);
    await fetch(`/api/form-labels/${formId}`, { method: 'DELETE' });
    setSavingId(null);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center gap-3">
        <Link href="/admin" className="text-blue-500 hover:underline text-sm">
          ← Administrēšana
        </Link>
        <h1 className="text-xl font-bold text-gray-800">🏷️ Veidlapu nosaukumi</h1>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm text-gray-500 mb-4">
          Pielāgotais nosaukums parādās tikai izvēlēs un sarakstos (ārstu piešķiršana, ārsta
          veidlapu izvēle) — izdrukātajā veidlapā paliek tās oficiālais nosaukums.
        </p>

        {loading ? (
          <div className="text-gray-400 animate-pulse text-center py-10">Ielādē...</div>
        ) : (
          <div className="space-y-3">
            {FORMS.map((form) => {
              const defaultName = form.subtitle ? `${form.title} — ${form.subtitle}` : form.title;
              const draft = drafts[form.id] ?? '';
              const hasOverride = !!overrides[form.id];
              const dirty = draft !== (overrides[form.id] ?? '');
              return (
                <div key={form.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                  <span className="text-3xl shrink-0">{form.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                        {form.id}
                      </span>
                      <span className="text-xs text-gray-400 truncate">{defaultName}</span>
                    </div>
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [form.id]: e.target.value }))
                      }
                      placeholder={defaultName}
                      maxLength={100}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSave(form.id)}
                      disabled={!dirty || savingId === form.id}
                      className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
                    >
                      Saglabāt
                    </button>
                    <button
                      onClick={() => handleReset(form.id)}
                      disabled={!hasOverride || savingId === form.id}
                      className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-40"
                    >
                      Atiestatīt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
