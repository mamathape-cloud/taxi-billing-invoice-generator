import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth.js";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/company", label: "Company Settings" },
  { to: "/customers", label: "Customers" },
  { to: "/vehicles", label: "Vehicles" },
  { to: "/drivers", label: "Drivers" },
  { to: "/invoices", label: "Invoices" },
  { to: "/reports", label: "Reports" }
];

function cls(isActive) {
  return [
    "block rounded-lg px-3 py-2 text-sm font-medium",
    isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
  ].join(" ");
}

function HamburgerIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  const navContent = (
    <>
      <nav className="space-y-1">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => cls(isActive)} onClick={closeMenu}>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6 border-t border-gray-200 pt-4">
        <button
          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
          onClick={() => {
            closeMenu();
            handleLogout();
          }}
        >
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 py-6">
          <aside className="hidden w-64 flex-none rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 md:block">
            <div className="mb-4">
              <div className="text-lg font-semibold text-gray-900">Taxi Billing</div>
              <div className="text-xs text-gray-500">Office Dashboard</div>
            </div>
            {navContent}
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between md:hidden">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <HamburgerIcon className="h-6 w-6" />
                </button>
                <div>
                  <div className="text-lg font-semibold text-gray-900">Taxi Billing</div>
                  <div className="text-xs text-gray-500">Office Dashboard</div>
                </div>
              </div>
              <button
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>

            {/* Mobile slide-out menu */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50 md:hidden"
                  aria-hidden
                  onClick={closeMenu}
                />
                <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl md:hidden">
                  <div className="flex items-center justify-between border-b border-gray-200 p-4">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">Taxi Billing</div>
                      <div className="text-xs text-gray-500">Office Dashboard</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 focus:outline-none"
                      onClick={closeMenu}
                      aria-label="Close menu"
                    >
                      <CloseIcon className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="p-4">
                    {navContent}
                  </div>
                </div>
              </>
            )}

            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 md:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

