'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Doctor } from '@/lib/types';
import { FORMS } from '@/lib/form-definitions';

const AVATARS = ['👩‍⚕️', '👨‍⚕️', '🩺', '🔬', '🏥', '💉', '🧬', '🫀', '🧠', '🦷'];

export default function AdminPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [adding, setAdding] = useState(false);
  const [dbStatus, setDbStatus] = useState<string | null>(null);

  const loadDoctors = async () => {
    const res = await fetch('/api/doctors');
    const data = await res.json();
    setDoctors(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleInitDb = async () => {
    setDbStatus('Inicializē...');
    const res = await fetch('/api/db-init', { method: 'POST' });
    const data = await res.json();
    setDbStatus(data.message ?? data.error ?? 'Gatavs');
    loadDoctors();
  };

  const handleSaveDoctor = async (doc: Partial<Doctor> & { id?: number }) => {
    const method = doc.id ? 'PUT' : 'POST';
    const url = doc.id ? `/api/doctors/${doc.id}` : '/api/doctors';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    setEditing(null);
    setAdding(false);
    loadDoctors();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/doctors/${id}`, { method: 'DELETE' });
    loadDoctors();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-blue-500 hover:underline text-sm">
            ← Sākums
          </Link>
          <h1 className="text-xl font-bold text-gray-800">⚙️ Administrēšana</h1>
        </div>
        <button
          onClick={handleInitDb}
          className="px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
        >
          Inicializēt DB
        </button>
      </div>

      {dbStatus && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-2 text-sm text-blue-700">
          {dbStatus}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Ārsti</h2>
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Pievienot ārstu
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400 animate-pulse text-center py-10">Ielādē...</div>
        ) : (
          <div className="space-y-3">
            {doctors.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                <span className="text-4xl">{doc.avatar}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{doc.name}</div>
                  <div className="text-sm text-gray-500 flex flex-wrap gap-1 mt-1">
                    {doc.form_ids.map((fid) => (
                      <span key={fid} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs">
                        {fid}
                      </span>
                    ))}
                    {doc.form_ids.length === 0 && (
                      <span className="text-gray-300 text-xs">Nav veidlapu</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(doc)}
                    className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    Rediģēt
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-sm px-3 py-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100"
                  >
                    Dzēst
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Doctor edit/add form */}
        {(editing || adding) && (
          <DoctorForm
            initial={editing ?? undefined}
            onSave={handleSaveDoctor}
            onCancel={() => {
              setEditing(null);
              setAdding(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function DoctorForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Doctor;
  onSave: (doc: Partial<Doctor>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? '👤');
  const [formIds, setFormIds] = useState<string[]>(initial?.form_ids ?? []);

  const toggleForm = (fid: string) => {
    setFormIds((prev) => (prev.includes(fid) ? prev.filter((f) => f !== fid) : [...prev, fid]));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          {initial ? 'Rediģēt ārstu' : 'Jauns ārsts'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Vārds</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ārsta vārds"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Avatars</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-2xl p-1.5 rounded-lg border-2 transition ${
                    avatar === a ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-2">Veidlapas</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMS.map((form) => (
                <button
                  key={form.id}
                  onClick={() => toggleForm(form.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                    formIds.includes(form.id)
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span>{form.avatar}</span>
                  <span className="font-mono text-xs">{form.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Atcelt
          </button>
          <button
            onClick={() => onSave({ ...(initial ?? {}), name, avatar, form_ids: formIds })}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Saglabāt
          </button>
        </div>
      </div>
    </div>
  );
}
