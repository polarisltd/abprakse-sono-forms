'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormDef, FormField, Statement } from '@/lib/types';
import { commonFieldIds } from '@/lib/templates';
import TemplateBar, { TemplateBarHandle } from './TemplateBar';

interface Props {
  formDef: FormDef;
  statementId: number;
  initialData: Record<string, unknown>;
  readOnly?: boolean;
  onSaved?: (updated: Statement) => void;
  /** Stamped onto templates saved from this form, for audit only. */
  doctorId?: number | null;
  /** Defaults to on whenever the form is editable. */
  templatesEnabled?: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function FormRenderer({
  formDef,
  statementId,
  initialData,
  readOnly = false,
  onSaved,
  doctorId,
  templatesEnabled,
}: Props) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // dataRef always mirrors the latest data — updated synchronously before any save
  const dataRef = useRef<Record<string, unknown>>(initialData);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateBarRef = useRef<TemplateBarHandle>(null);

  // Patient/visit fields live in top-level columns, not in form_data. Driven by
  // the shared helper (the `common` flag on the field definitions) so the save
  // split and the template sanitiser can never disagree about what is PII.
  const commonIds = useMemo(() => commonFieldIds(formDef.id), [formDef.id]);

  const save = useCallback(async () => {
    const snapshot = { ...dataRef.current };

    const commonFields: Record<string, unknown> = {};
    const formData: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(snapshot)) {
      if (commonIds.has(k)) {
        commonFields[k] = v;
      } else {
        formData[k] = v;
      }
    }

    setSaveState('saving');
    try {
      const res = await fetch(`/api/statements/${statementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commonFields, form_data: formData }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: Statement = await res.json();
      onSaved?.(updated);
      setSaveState('saved');
      if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
      saveStateTimerRef.current = setTimeout(() => setSaveState('idle'), 1800);
    } catch {
      setSaveState('error');
    }
  }, [statementId, onSaved, commonIds]);

  // Debounced save for typing fields (text, number)
  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(), 600);
  }, [save]);

  // Immediate save on blur (text/number) or change (boolean/select)
  const saveNow = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save();
  }, [save]);

  const handleChange = useCallback(
    (fieldId: string, value: unknown, immediate = false) => {
      // Update ref synchronously first so save() always reads the latest value
      const next = { ...dataRef.current, [fieldId]: value };
      dataRef.current = next;
      setData(next);
      templateBarRef.current?.markDirty();
      if (immediate) {
        saveNow();
      } else {
        scheduleSave();
      }
    },
    [saveNow, scheduleSave]
  );

  const handleBlur = useCallback(
    (fieldId: string, value: unknown) => {
      const next = { ...dataRef.current, [fieldId]: value };
      dataRef.current = next;
      setData(next);
      templateBarRef.current?.markDirty();
      saveNow();
    },
    [saveNow]
  );

  /** Snapshot for TemplateBar's Save / Pārrakstīt, read only when tapped. */
  const getCurrentData = useCallback(() => dataRef.current, []);

  /**
   * Apply a template: full replace of every field it covers, persisted through
   * the same save path as any field edit. Returns the undo closure that the
   * toast wires to "Atsaukt" — FormRenderer owns it because FormRenderer owns
   * dataRef, and there must stay exactly one writer to the form state.
   */
  const applyTemplate = useCallback(
    (values: Record<string, unknown>) => {
      const previous = { ...dataRef.current };

      const next = { ...dataRef.current };
      for (const [k, v] of Object.entries(values)) {
        // Belt and braces: the API already strips these, but a patient name
        // must never be written back into a live form by a template.
        if (commonIds.has(k)) continue;
        next[k] = v;
      }

      dataRef.current = next;
      setData(next);
      saveNow();

      return () => {
        dataRef.current = previous;
        setData(previous);
        saveNow();
      };
    },
    [commonIds, saveNow]
  );

  const calc = useCallback((id: string): unknown => {
    const allFields = formDef.sections.flatMap((s) => s.rows.flatMap((r) => r.fields));
    const field = allFields.find((f) => f.id === id);
    if (!field?.calcFrom) return '';
    return field.calcFrom.reduce((sum, key) => {
      const v = Number(dataRef.current[key] ?? 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }, [formDef]);

  const renderField = (field: FormField) => {
    if (field.type === 'calculated') {
      const value = calc(field.id);
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
            // Booleans have no blur — save immediately on change
            onChange={(e) => handleChange(field.id, e.target.checked, true)}
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
          // Selects save immediately on change
          onChange={(e) => handleChange(field.id, e.target.value, true)}
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

  const showTemplates = templatesEnabled ?? !readOnly;

  return (
    <div className="space-y-6">
      {showTemplates && (
        <TemplateBar
          ref={templateBarRef}
          formId={formDef.id}
          doctorId={doctorId}
          getCurrentData={getCurrentData}
          onApply={applyTemplate}
        />
      )}

      {/* Save indicator */}
      {!readOnly && (
        <div className="flex justify-end h-4">
          {saveState === 'saving' && (
            <span className="text-xs text-gray-400 animate-pulse">Saglabā...</span>
          )}
          {saveState === 'saved' && (
            <span className="text-xs text-green-600">✓ Saglabāts</span>
          )}
          {saveState === 'error' && (
            <span className="text-xs text-red-500">⚠ Kļūda saglabājot</span>
          )}
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
                const allBool = row.fields.every((f) => f.type === 'boolean');

                if (allBool) {
                  return (
                    <div key={rowIdx} className="flex flex-wrap gap-4 py-1">
                      {row.fields.map((field) => (
                        <div key={field.id}>{renderField(field)}</div>
                      ))}
                    </div>
                  );
                }

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

                const nonBoolFields = row.fields.filter((f) => f.type !== 'boolean');
                if (nonBoolFields.length > 1 || (row.fields.length > 1 && allBool === false)) {
                  return (
                    <div
                      key={rowIdx}
                      className="grid gap-2 items-start"
                      style={{ gridTemplateColumns: `repeat(${row.fields.length}, 1fr)` }}
                    >
                      {row.fields.map((field) => (
                        <div key={field.id}>
                          {field.type !== 'boolean' && (
                            <label className="text-xs text-gray-500 block mb-0.5">
                              {field.label}
                            </label>
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
                          <label className="text-xs text-gray-500 whitespace-nowrap">
                            {field.label}
                          </label>
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
