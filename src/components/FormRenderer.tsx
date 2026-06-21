'use client';

import { useCallback, useRef, useState } from 'react';
import { FormDef, FormField } from '@/lib/types';

interface Props {
  formDef: FormDef;
  statementId: number;
  initialData: Record<string, unknown>;
  readOnly?: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const COMMON_FIELDS = new Set(['patient_name', 'patient_birth_year', 'visit_date']);

export default function FormRenderer({ formDef, statementId, initialData, readOnly = false }: Props) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const pendingRef = useRef<Record<string, unknown>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calc = useCallback(
    (id: string, fields: FormField[]): unknown => {
      const field = fields.find((f) => f.id === id);
      if (!field?.calcFrom) return '';
      return field.calcFrom.reduce((sum, key) => {
        const v = Number(data[key] ?? 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
    },
    [data]
  );

  const flush = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!Object.keys(patch).length) return;
      setSaveState('saving');
      try {
        const commonPatch: Record<string, unknown> = {};
        const formDataPatch: Record<string, unknown> = {};

        for (const [k, v] of Object.entries(patch)) {
          if (COMMON_FIELDS.has(k)) {
            commonPatch[k] = v;
          } else {
            formDataPatch[k] = v;
          }
        }

        const body: Record<string, unknown> = { ...commonPatch };
        if (Object.keys(formDataPatch).length) {
          // Merge with existing form_data from server
          const currentFormData = (data['__form_data__'] as Record<string, unknown>) ?? {};
          body.form_data = { ...currentFormData, ...formDataPatch };
        }

        const res = await fetch(`/api/statements/${statementId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated = await res.json();
        setData((prev) => ({
          ...prev,
          ...updated.form_data,
          patient_name: updated.patient_name,
          patient_birth_year: updated.patient_birth_year,
          visit_date: updated.visit_date,
          __form_data__: updated.form_data,
        }));
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('error');
      }
    },
    [data, statementId]
  );

  const handleChange = useCallback(
    (fieldId: string, value: unknown) => {
      setData((prev) => ({ ...prev, [fieldId]: value }));
      pendingRef.current[fieldId] = value;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const patch = { ...pendingRef.current };
        pendingRef.current = {};
        flush(patch);
      }, 800);
    },
    [flush]
  );

  const handleBlur = useCallback(
    (fieldId: string, value: unknown) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current[fieldId] = value;
      const patch = { ...pendingRef.current };
      pendingRef.current = {};
      flush(patch);
    },
    [flush]
  );

  const renderField = (field: FormField) => {
    if (field.type === 'calculated') {
      const allFields = formDef.sections.flatMap((s) => s.rows.flatMap((r) => r.fields));
      const value = calc(field.id, allFields);
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-700 text-lg">{String(value)}</span>
          {field.max !== undefined && <span className="text-gray-400 text-sm">/ {field.max}</span>}
        </div>
      );
    }

    const value = data[field.id] ?? '';
    const baseInput =
      'border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100';

    if (field.type === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 accent-blue-600"
            checked={Boolean(value)}
            disabled={readOnly}
            onChange={(e) => handleChange(field.id, e.target.checked)}
          />
          <span className="text-sm text-gray-700">{field.label}</span>
        </label>
      );
    }

    if (field.type === 'select') {
      return (
        <select
          className={`${baseInput} w-full`}
          value={String(value)}
          disabled={readOnly}
          onChange={(e) => handleChange(field.id, e.target.value)}
          onBlur={(e) => handleBlur(field.id, e.target.value)}
        >
          <option value=""></option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          className={`${baseInput} w-full resize-none`}
          rows={field.lines ?? 2}
          value={String(value)}
          disabled={readOnly}
          onChange={(e) => handleChange(field.id, e.target.value)}
          onBlur={(e) => handleBlur(field.id, e.target.value)}
        />
      );
    }

    const inputType =
      field.type === 'date'
        ? 'date'
        : field.type === 'integer' || field.type === 'year' || field.type === 'decimal'
          ? 'number'
          : 'text';

    return (
      <div className="flex items-center gap-1">
        <input
          type={inputType}
          className={`${baseInput} w-full`}
          value={String(value)}
          min={field.min}
          max={field.max}
          step={field.type === 'decimal' ? '0.1' : undefined}
          disabled={readOnly}
          onChange={(e) => handleChange(field.id, e.target.value)}
          onBlur={(e) => handleBlur(field.id, e.target.value)}
        />
        {field.unit && <span className="text-xs text-gray-500 whitespace-nowrap">{field.unit}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Save indicator */}
      {!readOnly && (
        <div className="flex justify-end">
          {saveState === 'saving' && <span className="text-xs text-gray-400 animate-pulse">Saglabā...</span>}
          {saveState === 'saved' && <span className="text-xs text-green-600">✓ Saglabāts</span>}
          {saveState === 'error' && <span className="text-xs text-red-500">⚠ Kļūda saglabājot</span>}
        </div>
      )}

      {formDef.sections.map((section) => {
        if (section.rows.length === 0 && section.note) {
          return (
            <div key={section.id} className="text-xs text-gray-500 italic border-t pt-3">
              ⚠️ {section.note}
            </div>
          );
        }
        return (
          <div key={section.id}>
            {section.title && (
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide border-b pb-1 mb-3">
                {section.title}
              </h3>
            )}
            {section.note && (
              <p className="text-xs text-gray-500 italic mb-2">{section.note}</p>
            )}
            <div className="space-y-2">
              {section.rows.map((row, rowIdx) => {
                const boolFields = row.fields.filter((f) => f.type === 'boolean');
                const nonBoolFields = row.fields.filter((f) => f.type !== 'boolean');

                // All boolean in this row — render as compact checkbox group
                if (boolFields.length === row.fields.length) {
                  return (
                    <div key={rowIdx} className="flex flex-wrap gap-4 py-1">
                      {row.fields.map((field) => (
                        <div key={field.id}>{renderField(field)}</div>
                      ))}
                    </div>
                  );
                }

                // Mixed or single field row
                if (row.fields.length === 1) {
                  const field = row.fields[0];
                  if (field.type === 'boolean') {
                    return (
                      <div key={rowIdx} className="py-1">
                        {renderField(field)}
                      </div>
                    );
                  }
                  return (
                    <div key={rowIdx} className="grid grid-cols-[180px_1fr] items-start gap-2">
                      <label className="text-sm text-gray-600 pt-1.5 font-medium leading-tight">
                        {field.label}
                      </label>
                      <div>{renderField(field)}</div>
                    </div>
                  );
                }

                // Multiple non-boolean fields in a row
                if (nonBoolFields.length > 1 || (boolFields.length === 0 && row.fields.length > 1)) {
                  return (
                    <div key={rowIdx} className={`grid gap-2 items-start`}
                      style={{ gridTemplateColumns: `repeat(${row.fields.length}, 1fr)` }}>
                      {row.fields.map((field) => (
                        <div key={field.id}>
                          {field.type !== 'boolean' && (
                            <label className="text-xs text-gray-500 block mb-0.5">{field.label}</label>
                          )}
                          {renderField(field)}
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div key={rowIdx} className="flex flex-wrap gap-4 items-center py-1">
                    {row.fields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2">
                        {field.type !== 'boolean' && (
                          <label className="text-xs text-gray-500 whitespace-nowrap">{field.label}</label>
                        )}
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
