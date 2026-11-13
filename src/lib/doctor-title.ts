/** What a doctor is called when no title was entered — also the DB column default. */
export const DEFAULT_DOCTOR_TITLE = 'Ārsts';

/** A blank or missing title falls back to the default, so a title is never empty. */
export function normalizeDoctorTitle(title: unknown): string {
  const trimmed = typeof title === 'string' ? title.trim().slice(0, 100) : '';
  return trimmed || DEFAULT_DOCTOR_TITLE;
}
