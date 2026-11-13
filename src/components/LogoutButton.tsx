'use client';

export default function LogoutButton() {
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  };
  return (
    <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600 underline">
      Iziet
    </button>
  );
}
