'use client';

import { useCallback, useRef, useState } from 'react';
import { Statement } from '@/lib/types';
import RichTextEditor from './RichTextEditor';

interface Props {
  statement: Statement;
  readOnly?: boolean;
  onSaved?: (updated: Statement) => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * The rich-text counterpart to FormRenderer — one editable body instead of a
 * sections/rows walk, and deliberately no TemplateBar: template choice
 * happened once, at creation (PatientPicker), not per-field inside the
 * editor. See specs/feature-document-templates.md §9.4.
 */
export default function DocumentRenderer({ statement, readOnly = false, onSaved }: Props) {
  const [html, setHtml] = useState(statement.body_html ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const htmlRef = useRef(html);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/statements/${statement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_html: htmlRef.current }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: Statement = await res.json();
      onSaved?.(updated);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1800);
    } catch {
      setSaveState('error');
    }
  }, [statement.id, onSaved]);

  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(), 600);
  }, [save]);

  const saveNow = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save();
  }, [save]);

  const handleChange = (next: string) => {
    htmlRef.current = next;
    setHtml(next);
    scheduleSave();
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end h-4">
          {saveState === 'saving' && <span className="text-xs text-gray-400 animate-pulse">Saglabā...</span>}
          {saveState === 'saved' && <span className="text-xs text-green-600">✓ Saglabāts</span>}
          {saveState === 'error' && <span className="text-xs text-red-500">⚠ Kļūda saglabājot</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 rounded-lg px-4 py-3">
        <div>
          <div className="text-xs text-gray-400">Pacients</div>
          {/* 50% over the editor's 18px default (RichTextEditor's
              DEFAULT_FONT_SIZE) — same reasoning as PATIENT_IDENTITY_FIELD_IDS
              on the structured forms: a doctor needs to confirm the right
              patient at a glance. Kept proportional on purpose. */}
          <div className="font-medium text-gray-800" style={{ fontSize: '27px' }}>
            {statement.patient_name || '—'}
            {statement.patient_birth_year ? ` (${statement.patient_birth_year})` : ''}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Ārsts</div>
          <div className="font-medium text-gray-800">{statement.doctor_name || '—'}</div>
        </div>
      </div>

      <RichTextEditor value={html} onChange={handleChange} onBlur={saveNow} readOnly={readOnly} />
    </div>
  );
}
