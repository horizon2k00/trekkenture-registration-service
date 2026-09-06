import { LogOut, Mountain, Plus } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

export function AdminShell() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            to="/admin/forms"
            className="flex items-center gap-2 font-bold text-slate-900"
          >
            <Mountain className="h-6 w-6 text-primary" />
            Trekkenture Admin
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <NavLink
              to="/admin/forms"
              className="font-medium text-slate-600 hover:text-primary"
            >
              Forms
            </NavLink>
            <NavLink
              to="/admin/questions"
              className="font-medium text-slate-600 hover:text-primary"
            >
              Question library
            </NavLink>
            <Link
              to="/admin/forms/new"
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> New form
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1 px-2 py-2 text-slate-500"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
