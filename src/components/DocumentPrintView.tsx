'use client';

import { forwardRef } from 'react';
import { PRACTICE } from '@/lib/form-definitions';
import { Statement } from '@/lib/types';
import { sanitizeRichText } from '@/lib/sanitize-html';

interface Props {
  statement: Statement;
}

/**
 * The rich-text counterpart to PrintView — same header/footer chrome, but the
 * body is the document's own HTML instead of a sections/rows table. Always
 * single-column: there's no second shape to weigh against, unlike
 * PrintView's SINGLE_COLUMN_FORMS. See
 * specs/feature-document-templates.md §9.5.
 */
const DocumentPrintView = forwardRef<HTMLDivElement, Props>(({ statement }, ref) => {
  // Re-sanitized at render time, not just at save time, so a template seeded
  // before a future allow-list change can't carry anything the current one
  // wouldn't permit.
  const safeHtml = sanitizeRichText(statement.body_html ?? '');

  return (
    <div ref={ref} className="print-page bg-white text-black font-sans text-xs p-6">
      <div className="flex justify-between items-start mb-3 pb-2 border-b border-black">
        <div>
          <div className="font-bold text-sm">{PRACTICE.name}</div>
          <div>{PRACTICE.address}</div>
          <div>
            Tālrunis: {PRACTICE.phone} | Mobilais: {PRACTICE.mobile}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-sm">{statement.template_name ?? 'Dokuments'}</div>
          <div className="mt-1">
            Nr. <span className="font-mono font-bold">{statement.doc_id}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between mb-3 text-xs">
        <div>
          Pacients:{' '}
          <span className="font-medium">
            {statement.patient_name || '—'}
            {statement.patient_birth_year ? `, dz.g. ${statement.patient_birth_year}` : ''}
          </span>
        </div>
        <div>Datums: {statement.visit_date}</div>
      </div>

      <div
        className="rich-text-print [&_p]:my-1"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      <div className="mt-4 pt-3 border-t border-black flex justify-between">
        <div>
          <div className="mb-6">Ārsts (paraksts, spiedogs): _____________________</div>
          <div>Datums: {statement.visit_date}</div>
        </div>
        {statement.doctor_name && (
          <div className="text-right text-gray-500">Ārsts: {statement.doctor_name}</div>
        )}
      </div>
    </div>
  );
});

DocumentPrintView.displayName = 'DocumentPrintView';

export default DocumentPrintView;
