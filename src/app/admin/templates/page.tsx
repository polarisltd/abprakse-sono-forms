'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DocTemplate } from '@/lib/types';
import RichTextEditor from '@/components/RichTextEditor';

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  // Starts true (not set synchronously in the mount effect below) — see the
  // identical note on TemplateBar's own load effect.
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DocTemplate | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    fetch('/api/doc-templates')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (tpl: { id?: number; name: string; body_html: string }) => {
    const method = tpl.id ? 'PUT' : 'POST';
    const url = tpl.id ? `/api/doc-templates/${tpl.id}` : '/api/doc-templates';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tpl.name, body_html: tpl.body_html }),
    });
    setEditing(null);
    setAdding(false);
    load();
  };

  const toggleActive = async (tpl: DocTemplate) => {
    await fetch(`/api/doc-templates/${tpl.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !tpl.active }),
    });
    load();
  };

  const handleDelete = async (tpl: DocTemplate) => {
    if (!confirm(`Dzēst veidni "${tpl.name}"? Jau izveidotie dokumenti netiks ietekmēti.`)) return;
    await fetch(`/api/doc-templates/${tpl.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-blue-500 hover:underline text-sm">
            ← Administrēšana
          </Link>
          <h1 className="text-xl font-bold text-gray-800">📝 Dokumentu veidnes</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Jauna veidne
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {loading ? (
          <div className="text-gray-400 animate-pulse text-center py-10">Ielādē...</div>
        ) : templates.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <div className="text-4xl mb-3">📝</div>
            <p>Nav izveidotu veidņu.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white rounded-xl shadow p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                      {tpl.code}
                    </span>
                    <span className="font-medium text-gray-800">{tpl.name}</span>
                    {!tpl.active && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Arhivēts
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate mt-1">
                    {stripTags(tpl.body_html) || 'Tukša veidne'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setEditing(tpl)}
                    className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    Rediģēt
                  </button>
                  <button
                    onClick={() => toggleActive(tpl)}
                    className="text-sm px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    {tpl.active ? 'Arhivēt' : 'Atjaunot'}
                  </button>
                  <button
                    onClick={() => handleDelete(tpl)}
                    className="text-sm px-3 py-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100"
                  >
                    Dzēst
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(editing || adding) && (
          <TemplateForm
            initial={editing ?? undefined}
            onSave={handleSave}
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

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DocTemplate;
  onSave: (tpl: { id?: number; name: string; body_html: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [bodyHtml, setBodyHtml] = useState(initial?.body_html ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({ id: initial?.id, name: name.trim(), body_html: bodyHtml });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          {initial ? 'Rediģēt veidni' : 'Jauna veidne'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Nosaukums</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="piem. Vēdera dobuma US."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Teksts</label>
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
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
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saglabā...' : 'Saglabāt'}
          </button>
        </div>
      </div>
    </div>
  );
}
