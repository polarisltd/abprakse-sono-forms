import Link from 'next/link';
import { PRACTICE } from '@/lib/form-definitions';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-gray-800">{PRACTICE.name}</h1>
        <p className="text-gray-500 mt-1">{PRACTICE.address}</p>
        <p className="text-gray-400 text-sm">
          Tel. {PRACTICE.phone} | Mob. {PRACTICE.mobile}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <Link
          href="/doctor"
          className="flex flex-col items-center gap-4 bg-white rounded-2xl shadow-lg p-10 hover:shadow-xl hover:-translate-y-1 transition-all border border-blue-100 w-56"
        >
          <span className="text-6xl">🩺</span>
          <span className="text-xl font-semibold text-gray-700">Ārsts</span>
          <span className="text-sm text-gray-400 text-center">Aizpildīt veidlapu</span>
        </Link>

        <Link
          href="/midwife"
          className="flex flex-col items-center gap-4 bg-white rounded-2xl shadow-lg p-10 hover:shadow-xl hover:-translate-y-1 transition-all border border-green-100 w-56"
        >
          <span className="text-6xl">📋</span>
          <span className="text-xl font-semibold text-gray-700">Māsīte</span>
          <span className="text-sm text-gray-400 text-center">Skatīt paziņojumus</span>
        </Link>
      </div>

      <div className="mt-8">
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600 underline">
          Administrēšana
        </Link>
      </div>
    </main>
  );
}
