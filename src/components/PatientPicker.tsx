'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Patient } from '@/lib/types';

export interface PatientPickerProps {
  /** Which document template this patient is being chosen for — shown in the header. */
  templateName: string;
  onCancel: () => void;
  onConfirm: (patient: Patient) => void;
}

/**
 * "Choose or create patient" — search-as-you-type against the persistent
 * roster, or create a new entry inline. See
 * specs/feature-document-templates.md §9.2. Modal, opened before
 * POST /api/statements fires, so there is always a patient_id by the time a
 * document is created.
 */
export default function PatientPicker({ templateName, onCancel, onConfirm }: PatientPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  // Starts true — the mount effect's initial search must not call
  // setLoading(true) synchronously (react-hooks/set-state-in-effect), same
  // reasoning as TemplateBar's own load effect.
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [creating, setCreating] = useState(false);

  const [newName, setNewName] = useState('');
  const [newBirthYear, setNewBirthYear] = useState('');
  const [newPersonalCode, setNewPersonalCode] = useState('');
  const [saving, setSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    fetch(`/api/patients?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setResults(Array.isArray(rows) ? rows : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    search('');
  }, [search]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setSelected(null);
    setLoading(true); // event handler, not an effect body — safe here
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 250);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          birth_year: newBirthYear || null,
          personal_code: newPersonalCode || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: Patient = await res.json();
      onConfirm(created);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Jauns dokuments</h3>
        <p className="text-sm text-gray-500 mb-4">{templateName} — izvēlieties vai izveidojiet pacientu</p>

        {!creating ? (
          <>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Meklēt pacientu pēc vārda..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3"
            />

            <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100 mb-3">
              {loading ? (
                <div className="text-center text-gray-400 text-sm py-6 animate-pulse">Meklē...</div>
              ) : results.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-6">Nav atrasts neviens pacients</div>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`w-full text-left px-3 py-2 text-sm transition ${
                      selected?.id === p.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium text-gray-800">{p.name}</span>
                    {p.birth_year && <span className="text-gray-400 ml-2">{p.birth_year}</span>}
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setNewName(query);
                setCreating(true);
              }}
              className="text-sm text-blue-600 hover:underline mb-4"
            >
              + Jauns pacients
            </button>

            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Atcelt
              </button>
              <button
                onClick={() => selected && onConfirm(selected)}
                disabled={!selected}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Izveidot
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">Vārds, uzvārds</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-600 block mb-1">Dzimšanas gads</label>
                  <input
                    type="number"
                    value={newBirthYear}
                    onChange={(e) => setNewBirthYear(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-600 block mb-1">Personas kods</label>
                  <input
                    type="text"
                    value={newPersonalCode}
                    onChange={(e) => setNewPersonalCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Atpakaļ
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Izveido...' : 'Izveidot pacientu un dokumentu'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
