'use client';

import { useEffect } from 'react';

export interface ToastMessage {
  /** Bump this for every new toast so the dismiss timer restarts. */
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
  durationMs?: number;
  tone?: 'default' | 'error';
}

interface Props {
  message: ToastMessage | null;
  onDismiss: () => void;
}

/**
 * One-line toast with an optional single action, pinned bottom-centre.
 *
 * This is the whole confirmation strategy for templates: applying, overwriting
 * and deleting all happen immediately and offer "Atsaukt" here instead of
 * asking first. A dialog on every apply is a dialog the doctor stops reading
 * within a week; a toast costs nothing when they did mean it.
 */
export default function Toast({ message, onDismiss }: Props) {
  const id = message?.id;
  const duration = message?.durationMs ?? 10000;

  useEffect(() => {
    if (id == null) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm text-white ${
          message.tone === 'error' ? 'bg-red-600' : 'bg-gray-800'
        }`}
      >
        <span>{message.text}</span>
        {message.action && (
          <button
            onClick={() => {
              message.action?.onClick();
              onDismiss();
            }}
            className="font-semibold underline underline-offset-2 min-h-[32px] px-1 hover:text-blue-200 transition"
          >
            {message.action.label}
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label="Aizvērt"
          className="text-gray-400 hover:text-white transition px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
