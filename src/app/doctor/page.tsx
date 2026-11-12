'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Doctor, DocTemplate, FormLabel, Patient, Statement } from '@/lib/types';
import { FORM_MAP } from '@/lib/form-definitions';
import PatientPicker from '@/components/PatientPicker';

export default function DoctorPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Doctor | null>(null);

  // All active document templates, fetched once; which ones a given doctor
  // sees is filtered below by selected.form_ids, exactly like structured
  // forms — a template's code ('T001', …) lives in the same array as 'F001'.
  const [docTemplates, setDocTemplates] = useState<DocTemplate[]>([]);
  const [pickerTemplate, setPickerTemplate] = useState<DocTemplate | null>(null);
  const [creatingDoc, setCreatingDoc] = useState(false);

  // Admin-chosen display names for F-forms (see /admin/form-labels); a form
  // absent here just keeps its default title/subtitle.
  const [formLabels, setFormLabels] = useState<Record<string, string>>({});

  // The selected doctor's unfinished visits (any date) — prepared by a nurse
  // or left open by the doctor; a visit drops off once it is completed.
  const [pending, setPending] = useState<Statement[]>([]);

  // The selected doctor is mirrored in the URL (?doctor=ID) so the form's
  // "← Atpakaļ" link and a page reload land back in this doctor's area.
  const selectDoctor = (doc: Doctor | null) => {
    setSelected(doc);
    setPending([]);
    window.history.replaceState(null, '', doc ? `/doctor?doctor=${doc.id}` : '/doctor');
  };

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const handleDelete = async (s: Statement) => {
    const who = s.patient_name ? `, ${s.patient_name}` : '';
    if (!window.confirm(`Dzēst apmeklējumu Nr. ${s.doc_id}${who}? Ievadītie dati tiks neatgriezeniski dzēsti.`)) {
      return;
    }
    setDeletingId(s.id);
    try {
      const res = await fetch(`/api/statements/${s.id}`, { method: 'DELETE' });
      // 404/409: already deleted or completed elsewhere — gone from this grid either way.
      if (res.ok || res.status === 404 || res.status === 409) {
        setPending((list) => list.filter((x) => x.id !== s.id));
      } else {
        window.alert('Neizdevās dzēst apmeklējumu.');
      }
    } catch {
      window.alert('Neizdevās dzēst apmeklējumu.');
    } finally {
      setDeletingId(null);
    }
  };

  const selectedId = selected?.id;
  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;
    const load = () =>
      fetch(`/api/statements?doctor_id=${selectedId}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (!cancelled) setPending(Array.isArray(data) ? data : []);
        })
        .catch(() => {}); // keep whatever is shown; the next poll retries
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedId]);

  useEffect(() => {
    fetch('/api/doctors')
      .then((r) => r.json())
      .then((data) => {
        const list: Doctor[] = Array.isArray(data) ? data : [];
        setDoctors(list);
        const fromUrl = Number(new URLSearchParams(window.location.search).get('doctor'));
        const preselected = list.find((d) => d.id === fromUrl);
        if (preselected) setSelected(preselected);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/doc-templates?active=true')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDocTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch('/api/form-labels')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FormLabel[]) =>
        setFormLabels(Object.fromEntries(data.map((d) => [d.form_id, d.label])))
      )
      .catch(() => {});
  }, []);

  const handleCreateDocument = async (patient: Patient) => {
    if (!pickerTemplate || !selected || creatingDoc) return;
    setCreatingDoc(true);
    try {
      const res = await fetch('/api/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: pickerTemplate.id,
          doctor_id: selected.id,
          patient_id: patient.id,
          visit_date: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const statement = await res.json();
      window.location.href = `/document/${statement.id}`;
    } catch {
      setCreatingDoc(false);
    }
  };

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
                    onClick={() => selectDoctor(doc)}
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
                onClick={() => selectDoctor(null)}
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
                  const override = formLabels[fid]?.trim();
                  return (
                    <StartFormButton
                      key={fid}
                      doctorId={selected.id}
                      formId={fid}
                      avatar={form.avatar}
                      title={override || form.title}
                      subtitle={override ? undefined : form.subtitle}
                    />
                  );
                })}
                {docTemplates.filter((tpl) => selected.form_ids.includes(tpl.code)).map((tpl) => (
                  <button
                    key={`doc-${tpl.id}`}
                    onClick={() => setPickerTemplate(tpl)}
                    className="flex flex-col items-center gap-3 bg-white rounded-2xl shadow p-6 hover:shadow-md hover:-translate-y-0.5 transition-all border border-transparent hover:border-blue-200"
                  >
                    <span className="text-5xl">📝</span>
                    <div className="text-center">
                      <div className="font-medium text-gray-700 text-sm">{tpl.name}</div>
                      <div className="text-xs text-blue-400 mt-1">{tpl.code}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <h3 className="text-gray-600 mt-10 mb-4 font-medium">
              Nepabeigtie apmeklējumi{pending.length > 0 ? ` (${pending.length})` : ''}:
            </h3>

            {pending.length === 0 ? (
              <p className="text-gray-400">Nav nepabeigtu apmeklējumu.</p>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium w-24">Nr.</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Pacients</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Dz. g.</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Veidlapa</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Datums</th>
                      <th className="text-right px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pending.map((s) => {
                      const isDocument = s.template_id != null;
                      const form = s.form_id ? FORM_MAP[s.form_id] : null;
                      const formName = isDocument
                        ? s.template_name
                        : (s.form_id && formLabels[s.form_id]?.trim()) || form?.title || s.form_id;
                      const [y, m, d] = s.visit_date.split('-');
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-mono text-gray-500">{s.doc_id}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {s.patient_name || <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{s.patient_birth_year || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5">
                              <span>{isDocument ? '📝' : (form?.avatar ?? '📄')}</span>
                              <span className="text-gray-700">{formName}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{`${d}.${m}.${y}`}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Link
                              href={isDocument ? `/document/${s.id}` : `/form/${s.form_id}?id=${s.id}`}
                              className="text-xs text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50"
                            >
                              ✏️ Labot
                            </Link>
                            <button
                              onClick={() => handleDelete(s)}
                              disabled={deletingId === s.id}
                              className="text-xs text-red-600 hover:underline px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                            >
                              🗑 Dzēst
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
        )}
      </div>

      {pickerTemplate && (
        <PatientPicker
          templateName={pickerTemplate.name}
          onCancel={() => setPickerTemplate(null)}
          onConfirm={handleCreateDocument}
        />
      )}
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
