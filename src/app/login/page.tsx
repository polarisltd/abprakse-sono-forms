'use client';

import { useState } from 'react';
import { PRACTICE } from '@/lib/form-definitions';

/** Only a same-site path is accepted as the post-login destination. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/';
}

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        // Full navigation, so the proxy sees the new cookie on the next request.
        window.location.href = safeNext(new URLSearchParams(window.location.search).get('next'));
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.error === 'locked') {
        setError(`Pārāk daudz nepareizu mēģinājumu. Mēģiniet vēlreiz pēc ${data.retryAfterMinutes} min.`);
      } else if (data.error === 'used') {
        setError('Šis kods jau ir izmantots. Sagaidiet nākamo kodu autentifikatorā.');
      } else if (data.error === 'invalid') {
        setError('Nepareizs kods.');
      } else {
        setError(data.message ?? 'Neizdevās pieslēgties. Mēģiniet vēlreiz.');
      }
      setCode('');
    } catch {
      setError('Neizdevās pieslēgties. Pārbaudiet savienojumu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">{PRACTICE.name}</h1>
        <p className="text-gray-500 mt-1">Ultrasonoskopijas veidlapu sistēma</p>
      </div>

      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <div className="text-center">
          <div className="text-5xl mb-2">🔐</div>
          <label htmlFor="code" className="font-semibold text-gray-700 block">
            Ievadiet kodu no autentifikatora
          </label>
          <p className="text-sm text-gray-400 mt-1">6 cipari, mainās ik pēc 30 sekundēm</p>
        </div>

        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full text-center text-3xl font-mono tracking-[0.4em] border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="••••••"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
        >
          {busy ? 'Pārbauda...' : 'Pieslēgties'}
        </button>
      </form>
    </main>
  );
}
