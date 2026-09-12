'use client';

import { forwardRef } from 'react';
import { FormDef, FormField } from '@/lib/types';
import { PRACTICE } from '@/lib/form-definitions';
import { Statement } from '@/lib/types';

interface Props {
  formDef: FormDef;
  statement: Statement;
}

const PrintView = forwardRef<HTMLDivElement, Props>(({ formDef, statement }, ref) => {
  const data: Record<string, unknown> = {
    ...statement.form_data,
    patient_name: statement.patient_name,
    patient_birth_year: statement.patient_birth_year,
    visit_date: statement.visit_date,
  };

  const renderValue = (field: FormField): string => {
    if (field.type === 'calculated') {
      const total = (field.calcFrom ?? []).reduce((sum, key) => {
        return sum + Number(data[key] ?? 0);
      }, 0);
      return `${total}${field.max ? ` / ${field.max}` : ''}`;
    }
    const v = data[field.id];
    if (v === undefined || v === null || v === '') return '';
    if (field.type === 'boolean') return v ? '✓' : '—';
    if (field.unit) return `${v} ${field.unit}`;
    return String(v);
  };

  return (
    <div ref={ref} className="print-page bg-white text-black font-sans text-xs p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-3 pb-2 border-b border-black">
        <div>
          <div className="font-bold text-sm">{PRACTICE.name}</div>
          <div>{PRACTICE.address}</div>
          <div>Tālrunis: {PRACTICE.phone} | Mobilais: {PRACTICE.mobile}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-sm">{formDef.title}</div>
          {formDef.subtitle && <div className="text-gray-600">{formDef.subtitle}</div>}
          <div className="mt-1">Nr. <span className="font-mono font-bold">{statement.doc_id}</span></div>
        </div>
      </div>

      {/* Sections in 2-column layout (F005 prints single-column) */}
      <div className={formDef.id === 'F005' ? 'columns-1' : 'columns-2 gap-4'}>
        {formDef.sections.map((section) => {
          if (section.rows.length === 0 && section.note) {
            return (
              <div key={section.id} className="break-inside-avoid mt-2 text-gray-500 italic text-xs">
                ⚠️ {section.note}
              </div>
            );
          }
          return (
            <div key={section.id} className="break-inside-avoid mb-3">
              {section.title && (
                <div className="font-bold border-b border-gray-400 mb-1">{section.title}</div>
              )}
              {section.note && (
                <div className="italic text-gray-500 mb-1">{section.note}</div>
              )}
              <table className="w-full border-collapse">
                <tbody>
                  {section.rows.map((row, rowIdx) => {
                    const allBool = row.fields.every((f) => f.type === 'boolean');
                    if (allBool) {
                      return (
                        <tr key={rowIdx}>
                          <td colSpan={2} className="py-0.5">
                            <div className="flex flex-wrap gap-3">
                              {row.fields.map((field) => (
                                <span key={field.id}>
                                  <span className="mr-1">{data[field.id] ? '☑' : '☐'}</span>
                                  {field.label}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    if (row.fields.length === 1) {
                      const field = row.fields[0];
                      if (field.type === 'boolean') {
                        return (
                          <tr key={rowIdx}>
                            <td colSpan={2} className="py-0.5">
                              <span className="mr-1">{data[field.id] ? '☑' : '☐'}</span>
                              {field.label}
                            </td>
                          </tr>
                        );
                      }
                      if (field.type === 'textarea') {
                        return (
                          <tr key={rowIdx}>
                            <td className="font-medium pr-2 align-top py-0.5 whitespace-nowrap w-1/3">
                              {field.label}
                            </td>
                            <td className="py-0.5 border-b border-dotted border-gray-400 align-top">
                              <div
                                className="min-h-4 whitespace-pre-wrap"
                                style={{ minHeight: `${(field.lines ?? 2) * 1.2}em` }}
                              >
                                {renderValue(field)}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={rowIdx}>
                          <td className="font-medium pr-2 py-0.5 whitespace-nowrap w-1/3">{field.label}</td>
                          <td className="py-0.5 border-b border-dotted border-gray-400">{renderValue(field)}</td>
                        </tr>
                      );
                    }
                    // Multiple fields in a row
                    return (
                      <tr key={rowIdx}>
                        <td colSpan={2} className="py-0.5">
                          <div className="flex flex-wrap gap-3">
                            {row.fields.map((field) => (
                              <span key={field.id} className="flex items-center gap-1">
                                {field.type === 'boolean' ? (
                                  <>
                                    <span>{data[field.id] ? '☑' : '☐'}</span>
                                    <span>{field.label}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-gray-500">{field.label}:</span>
                                    <span className="font-medium border-b border-dotted border-gray-400 min-w-8 inline-block">
                                      {renderValue(field)}
                                    </span>
                                  </>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Signature */}
      <div className="mt-4 pt-3 border-t border-black flex justify-between">
        <div>
          <div className="mb-6">Ārsts (paraksts, spiedogs): _____________________</div>
          <div>Datums: {statement.visit_date}</div>
        </div>
        {statement.doctor_name && (
          <div className="text-right text-gray-500">
            Ārsts: {statement.doctor_name}
          </div>
        )}
      </div>
    </div>
  );
});

PrintView.displayName = 'PrintView';

export default PrintView;
