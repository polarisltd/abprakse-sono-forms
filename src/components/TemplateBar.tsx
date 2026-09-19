'use client';

import { Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { MAX_TEMPLATE_SLOTS, applicableTemplateValues, formFields } from '@/lib/templates';
import { FormTemplate } from '@/lib/types';
import Toast, { ToastMessage } from './Toast';

export interface TemplateBarHandle {
  /** Called by FormRenderer on every edit; only the first one after an apply costs a render. */
  markDirty: () => void;
}

export interface TemplateBarProps {
  formId: string;
  doctorId?: number | null;
  /**
   * Pull-based snapshot of the form. A getter rather than a `data` prop on
   * purpose: passing the data down would re-render the bar and its slot buttons
   * on every keystroke, and the bar only needs the values at the instant Save
   * or Pārrakstīt is tapped.
   */
  getCurrentData: () => Record<string, unknown>;
  /**
   * Hands the chosen values up to FormRenderer, which stays the only writer to
   * the form state. Returns the undo closure wired to the toast.
   */
  onApply: (values: Record<string, unknown>) => (() => void) | void;
  ref?: Ref<TemplateBarHandle>;
}

const bySlot = (a: FormTemplate, b: FormTemplate) => a.slot - b.slot;

/** A value the doctor actually entered, as opposed to a template's empty filler. */
const isFilled = (v: unknown) => v !== '' && v !== false && v !== null && v !== undefined;

export default function TemplateBar({
  formId,
  doctorId,
  getCurrentData,
  onApply,
  ref,
}: TemplateBarProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [modified, setModified] = useState(false);
  const activeIdRef = useRef<number | null>(null);
  const modifiedRef = useRef(false);

  const [sheetFor, setSheetFor] = useState<FormTemplate | null>(null);
  const [inspectFor, setInspectFor] = useState<FormTemplate | null>(null);
  const [labelFor, setLabelFor] = useState<FormTemplate | null>(null);
  const [labelDraft, setLabelDraft] = useState('');

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastSeq = useRef(0);

  const showToast = useCallback((t: Omit<ToastMessage, 'id'>) => {
    toastSeq.current += 1;
    setToast({ ...t, id: toastSeq.current });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const setActive = useCallback((id: number | null) => {
    activeIdRef.current = id;
    modifiedRef.current = false;
    setActiveId(id);
    setModified(false);
  }, []);

  // Only the first edit after an apply flips state; every later keystroke hits
  // the ref guard and returns without re-rendering the bar.
  useImperativeHandle(
    ref,
    () => ({
      markDirty: () => {
        if (activeIdRef.current === null || modifiedRef.current) return;
        modifiedRef.current = true;
        setModified(true);
      },
    }),
    []
  );

  // No setLoading(true) here: `loading` already starts true, and setting state
  // synchronously in an effect body triggers a cascading render (and trips
  // react-hooks/set-state-in-effect). A mounted form page never changes formId.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/templates?form_id=${encodeURIComponent(formId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (cancelled) return;
        setTemplates(Array.isArray(rows) ? [...rows].sort(bySlot) : []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const fieldLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of formFields(formId)) map[f.id] = f.label;
    return map;
  }, [formId]);

  const activeTemplate = templates.find((t) => t.id === activeId) ?? null;
  const slotsFull = templates.length >= MAX_TEMPLATE_SLOTS;

  // ---- actions -------------------------------------------------------------

  const handleApply = useCallback(
    (t: FormTemplate) => {
      const undo = onApply(applicableTemplateValues(formId, t.form_data));
      setActive(t.id);
      showToast({
        text: `${t.code} pielietots`,
        action: undo
          ? {
              label: 'Atsaukt',
              onClick: () => {
                undo();
                setActive(null);
              },
            }
          : undefined,
      });
    },
    [formId, onApply, setActive, showToast]
  );

  const restoreTemplate = useCallback(
    async (deleted: FormTemplate) => {
      try {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form_id: deleted.form_id,
            form_data: deleted.form_data,
            label: deleted.label,
            created_by: deleted.created_by,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created: FormTemplate = await res.json();
        setTemplates((prev) => [...prev, created].sort(bySlot));
        // The freed slot may have been claimed during the undo window — say so
        // rather than silently renaming the doctor's template.
        if (created.code !== deleted.code) showToast({ text: `Atjaunots kā ${created.code}` });
      } catch {
        showToast({ text: 'Neizdevās atjaunot veidni', tone: 'error', durationMs: 6000 });
      }
    },
    [showToast]
  );

  const handleDelete = useCallback(
    async (t: FormTemplate) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/templates/${t.id}`, { method: 'DELETE' });
        setTemplates((prev) => prev.filter((x) => x.id !== t.id));
        if (activeIdRef.current === t.id) setActive(null);

        if (res.status === 404) {
          showToast({ text: `${t.code} jau bija dzēsts`, tone: 'error', durationMs: 6000 });
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const { deleted } = (await res.json()) as { deleted: FormTemplate };
        showToast({
          text: `${t.code} dzēsts`,
          action: { label: 'Atsaukt', onClick: () => restoreTemplate(deleted) },
        });
      } catch {
        showToast({ text: 'Neizdevās dzēst veidni', tone: 'error', durationMs: 6000 });
      } finally {
        setBusy(false);
      }
    },
    [busy, restoreTemplate, setActive, showToast]
  );

  const handleSave = useCallback(async () => {
    if (busy || slotsFull) return;
    setBusy(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          form_data: getCurrentData(),
          created_by: doctorId ?? null,
        }),
      });
      if (res.status === 409) {
        showToast({
          text: `Visas ${MAX_TEMPLATE_SLOTS} vietas aizņemtas — nodzēsiet kādu veidni.`,
          tone: 'error',
          durationMs: 6000,
        });
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const created: FormTemplate = await res.json();
      setTemplates((prev) => [...prev, created].sort(bySlot));
      setActive(created.id);
      const filled = Object.values(created.form_data).filter(isFilled).length;
      showToast({
        text: `${created.code} saglabāts (${filled} lauki)`,
        action: {
          label: 'Nosaukums',
          onClick: () => {
            setLabelDraft('');
            setLabelFor(created);
          },
        },
      });
    } catch {
      showToast({ text: 'Neizdevās saglabāt veidni', tone: 'error', durationMs: 6000 });
    } finally {
      setBusy(false);
    }
  }, [busy, slotsFull, formId, getCurrentData, doctorId, setActive, showToast]);

  const patchTemplate = useCallback(
    async (t: FormTemplate, body: Record<string, unknown>) => {
      const res = await fetch(`/api/templates/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: FormTemplate = await res.json();
      setTemplates((prev) => prev.map((x) => (x.id === updated.id ? updated : x)).sort(bySlot));
      return updated;
    },
    []
  );

  const handleOverwrite = useCallback(
    async (t: FormTemplate) => {
      if (busy) return;
      setBusy(true);
      const previous = t.form_data;
      try {
        const updated = await patchTemplate(t, { form_data: getCurrentData() });
        setActive(updated.id);
        showToast({
          text: `${updated.code} pārrakstīts`,
          action: {
            label: 'Atsaukt',
            onClick: () => {
              patchTemplate(updated, { form_data: previous }).catch(() =>
                showToast({ text: 'Neizdevās atsaukt', tone: 'error', durationMs: 6000 })
              );
            },
          },
        });
      } catch {
        showToast({ text: 'Neizdevās pārrakstīt veidni', tone: 'error', durationMs: 6000 });
      } finally {
        setBusy(false);
      }
    },
    [busy, getCurrentData, patchTemplate, setActive, showToast]
  );

  const handleRename = useCallback(async () => {
    if (!labelFor) return;
    const target = labelFor;
    setLabelFor(null);
    try {
      const updated = await patchTemplate(target, { label: labelDraft });
      showToast({
        text: updated.label ? `${updated.code}: ${updated.label}` : `${updated.code} bez nosaukuma`,
        durationMs: 4000,
      });
    } catch {
      showToast({ text: 'Neizdevās pārdēvēt veidni', tone: 'error', durationMs: 6000 });
    }
  }, [labelFor, labelDraft, patchTemplate, showToast]);

  // ---- long press ----------------------------------------------------------

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);

  const startPress = useCallback((t: FormTemplate) => {
    suppressClick.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      suppressClick.current = true;
      setSheetFor(t);
    }, 500);
  }, []);

  const endPress = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }, []);

  useEffect(() => () => endPress(), [endPress]);

  // ---- render --------------------------------------------------------------

  const sheetButton =
    'w-full text-left px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition min-h-[44px]';

  return (
    <>
      <div
        style={{ top: 'var(--form-header-h, 57px)' }}
        className="no-print sticky z-[9] -mx-6 px-6 py-2 bg-white/95 backdrop-blur border-b border-gray-200"
      >
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={busy || slotsFull}
              title={slotsFull ? `Visas ${MAX_TEMPLATE_SLOTS} vietas aizņemtas` : 'Saglabāt veidni'}
              className="min-h-[44px] px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              💾 Saglabāt
            </button>
            <button
              onClick={() => activeTemplate && handleDelete(activeTemplate)}
              disabled={busy || !activeTemplate}
              title={activeTemplate ? `Dzēst ${activeTemplate.code}` : 'Vispirms pielietojiet veidni'}
              className="min-h-[44px] px-3 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              🗑 Dzēst
            </button>
          </div>

          <div className="w-px self-stretch bg-gray-200 shrink-0 mx-1" />

          {loading ? (
            <span className="text-xs text-gray-400 animate-pulse">Ielādē veidnes...</span>
          ) : templates.length === 0 ? (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Nav saglabātu veidņu — aizpildiet veidlapu un spiediet “Saglabāt”.
            </span>
          ) : (
            <div className="flex gap-2">
              {templates.map((t) => {
                const active = t.id === activeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      handleApply(t);
                    }}
                    onPointerDown={() => startPress(t)}
                    onPointerUp={endPress}
                    onPointerLeave={endPress}
                    onPointerCancel={endPress}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      endPress();
                      suppressClick.current = true;
                      setSheetFor(t);
                    }}
                    title={`${t.code}${t.label ? ` — ${t.label}` : ''} · turiet nospiestu, lai pārrakstītu`}
                    className={`shrink-0 min-w-[56px] min-h-[44px] px-3 py-1 rounded-lg border text-center select-none transition ${
                      active
                        ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-gray-800 leading-tight">
                      {t.code}
                      {active && modified && <span className="text-blue-500"> •</span>}
                    </span>
                    {t.label && (
                      <span className="block text-[10px] text-gray-500 leading-tight max-w-[88px] truncate">
                        {t.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Long-press action sheet — keeps overwrite/rename off the bar, where
          every extra button costs width the slots need. */}
      {sheetFor && (
        <div
          className="no-print fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center"
          onClick={() => setSheetFor(null)}
        >
          <div
            className="bg-white w-full sm:w-80 rounded-t-2xl sm:rounded-2xl p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 text-xs text-gray-500 border-b mb-1">
              {sheetFor.code}
              {sheetFor.label ? ` — ${sheetFor.label}` : ''}
            </div>
            <button
              className={sheetButton}
              onClick={() => {
                const t = sheetFor;
                setSheetFor(null);
                handleOverwrite(t);
              }}
            >
              ✏️ Pārrakstīt ar pašreizējiem datiem
            </button>
            <button
              className={sheetButton}
              onClick={() => {
                setLabelDraft(sheetFor.label ?? '');
                setLabelFor(sheetFor);
                setSheetFor(null);
              }}
            >
              🏷 Pārdēvēt
            </button>
            <button
              className={sheetButton}
              onClick={() => {
                setInspectFor(sheetFor);
                setSheetFor(null);
              }}
            >
              👁 Apskatīt saturu
            </button>
            <button
              className={`${sheetButton} text-red-600`}
              onClick={() => {
                const t = sheetFor;
                setSheetFor(null);
                handleDelete(t);
              }}
            >
              🗑 Dzēst
            </button>
            <button className={`${sheetButton} text-gray-400`} onClick={() => setSheetFor(null)}>
              Atcelt
            </button>
          </div>
        </div>
      )}

      {/* Label editor — always optional, never on the save path. */}
      {labelFor && (
        <div
          className="no-print fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setLabelFor(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full sm:w-80 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-700 mb-3">
              {labelFor.code} nosaukums
            </div>
            <input
              autoFocus
              value={labelDraft}
              maxLength={24}
              placeholder="piem. Norma"
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setLabelFor(null);
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setLabelFor(null)}
                className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                Atcelt
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Saglabāt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspector — templates outlive the 12h purge, so what a slot holds has
          to be visible and deletable. */}
      {inspectFor && (
        <div
          className="no-print fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setInspectFor(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full sm:max-w-md max-h-[70vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-gray-700 mb-3">
              {inspectFor.code}
              {inspectFor.label ? ` — ${inspectFor.label}` : ''}
            </div>
            <dl className="space-y-1 text-xs">
              {Object.entries(inspectFor.form_data)
                .filter(([, v]) => isFilled(v))
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[1fr_1fr] gap-2 border-b border-gray-100 py-1">
                    <dt className="text-gray-500">{fieldLabels[k] ?? k}</dt>
                    <dd className="text-gray-800 break-words">{String(v)}</dd>
                  </div>
                ))}
            </dl>
            {Object.values(inspectFor.form_data).filter(isFilled).length === 0 && (
              <p className="text-xs text-gray-400">Veidne ir tukša.</p>
            )}
            <button
              onClick={() => setInspectFor(null)}
              className="mt-4 w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Aizvērt
            </button>
          </div>
        </div>
      )}

      <Toast message={toast} onDismiss={dismissToast} />
    </>
  );
}
