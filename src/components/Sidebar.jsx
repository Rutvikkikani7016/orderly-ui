import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('ordernest_sidebar_collapsed') === 'true';
  });

  // Masters parent module open/collapse state
  const isInsideMasters = location.pathname.startsWith('/masters') || location.pathname === '/products';
  const [isMastersOpen, setIsMastersOpen] = useState(true);

  function toggleSidebar() {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ordernest_sidebar_collapsed', String(next));
      return next;
    });
  }

  function handleLogout() {
    logout();
    toast.success('Signed out');
    navigate('/login');
  }

  return (
    <aside
      className={`bg-white border-r border-border h-screen sticky top-0 flex flex-col justify-between shrink-0 select-none transition-all duration-300 ease-in-out z-30 ${
        isCollapsed ? 'w-16 p-2.5' : 'w-60 p-3.5'
      }`}
    >
      <div className="space-y-3 overflow-y-auto">
        {/* Brand Header & Collapse/Expand Toggle Button */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'flex-col space-y-2 justify-center' : 'justify-between px-1'
          } py-1 border-b border-border/60 pb-3`}
        >
          {isCollapsed ? (
            <>
              <img
                src="/logo-icon.png"
                alt="OrderNest"
                className="w-8 h-8 object-contain cursor-pointer hover:scale-105 transition-transform"
                onClick={toggleSidebar}
                title="Expand Sidebar"
              />
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                title="Expand Sidebar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2 overflow-hidden">
                <img src="/logo-full.png" alt="OrderNest" className="h-8 object-contain max-w-[140px]" />
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-ink flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Collapse Sidebar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {user?.role === 'super_admin' && (
            <div className="mb-2">
              <NavLink
                to="/super-admin"
                title="Super Admin Portal"
                className={({ isActive }) =>
                  `flex items-center ${
                    isCollapsed ? 'justify-center px-0 py-2' : 'space-x-2.5 px-3 py-2'
                  } rounded-lg text-xs font-bold transition-all shadow-xs border ${
                    isActive
                      ? 'bg-indigo-700 text-white border-indigo-400'
                      : 'bg-slate-900 text-indigo-300 hover:bg-slate-800 hover:text-white border-indigo-500/30'
                  }`
                }
              >
                <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] shrink-0">
                  ⚡
                </span>
                {!isCollapsed && <span className="truncate">Super Admin</span>}
              </NavLink>
            </div>
          )}

          {/* 1. Dashboard */}
          <NavLink
            to="/dashboard"
            title={isCollapsed ? 'Dashboard' : undefined}
            className={({ isActive }) =>
              `flex items-center ${
                isCollapsed ? 'justify-center px-0 py-2' : 'space-x-3 px-3 py-2'
              } rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent-light text-accent-dark font-semibold border border-accent/20 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
              }`
            }
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            {!isCollapsed && <span className="truncate">Dashboard</span>}
          </NavLink>

          {/* 2. Orders */}
          <NavLink
            to="/orders"
            title={isCollapsed ? 'Orders' : undefined}
            className={({ isActive }) =>
              `flex items-center ${
                isCollapsed ? 'justify-center px-0 py-2' : 'space-x-3 px-3 py-2'
              } rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent-light text-accent-dark font-semibold border border-accent/20 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
              }`
            }
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {!isCollapsed && <span className="truncate">Orders</span>}
          </NavLink>

          {/* 3. MASTERS PARENT MODULE (Product Master & Supplier Master) */}
          {isCollapsed ? (
            <NavLink
              to="/products"
              title="Masters (Product & Supplier)"
              className={`flex items-center justify-center px-0 py-2 rounded-lg text-xs font-medium transition-all ${
                isInsideMasters
                  ? 'bg-accent-light text-accent-dark font-semibold border border-accent/20 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </NavLink>
          ) : (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setIsMastersOpen(!isMastersOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isInsideMasters
                    ? 'text-ink bg-gray-50/80 font-bold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-ink'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Masters</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[9px] bg-accent-light text-accent px-1.5 py-0.2 rounded font-bold">
                    3
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                      isMastersOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Sub-modules for Masters */}
              {isMastersOpen && (
                <div className="ml-5 pl-2.5 border-l-2 border-accent/30 space-y-1 py-0.5">
                  {/* Sub-module: Product Master */}
                  <NavLink
                    to="/products"
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        isActive || location.pathname === '/masters/products'
                          ? 'bg-accent-light text-accent-dark font-bold'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
                      }`
                    }
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>Product Master</span>
                  </NavLink>

                  {/* Sub-module: Supplier Master */}
                  <NavLink
                    to="/masters/suppliers"
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        isActive
                          ? 'bg-accent-light text-accent-dark font-bold'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
                      }`
                    }
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Supplier Master</span>
                  </NavLink>

                  {/* Sub-module: Category & Unit Master */}
                  <NavLink
                    to="/masters/categories-units"
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        isActive
                          ? 'bg-accent-light text-accent-dark font-bold'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
                      }`
                    }
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Category & Unit Master</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* 4. Manufacturing & BOM */}
          <NavLink
            to="/manufacturing"
            title={isCollapsed ? 'Manufacturing & BOM' : undefined}
            className={({ isActive }) =>
              `flex items-center ${
                isCollapsed ? 'justify-center px-0 py-2' : 'space-x-3 px-3 py-2'
              } rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent-light text-accent-dark font-semibold border border-accent/20 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
              }`
            }
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {!isCollapsed && <span className="truncate">Manufacturing</span>}
          </NavLink>

          {/* 5. Raw Materials */}
          <NavLink
            to="/raw-materials"
            title={isCollapsed ? 'Raw Materials' : undefined}
            className={({ isActive }) =>
              `flex items-center ${
                isCollapsed ? 'justify-center px-0 py-2' : 'space-x-3 px-3 py-2'
              } rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent-light text-accent-dark font-semibold border border-accent/20 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
              }`
            }
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zM9 4v16m6-16v16" />
            </svg>
            {!isCollapsed && <span className="truncate">Raw Materials</span>}
          </NavLink>

          {/* 6. Platforms */}
          <NavLink
            to="/onboarding"
            title={isCollapsed ? 'Platforms' : undefined}
            className={({ isActive }) =>
              `flex items-center ${
                isCollapsed ? 'justify-center px-0 py-2' : 'space-x-3 px-3 py-2'
              } rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent-light text-accent-dark font-semibold border border-accent/20 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
              }`
            }
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {!isCollapsed && <span className="truncate">Platforms</span>}
          </NavLink>

          {/* 7. Profile */}
          <NavLink
            to="/profile"
            title={isCollapsed ? 'Profile' : undefined}
            className={({ isActive }) =>
              `flex items-center ${
                isCollapsed ? 'justify-center px-0 py-2' : 'space-x-3 px-3 py-2'
              } rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-accent-light text-accent-dark font-semibold border border-accent/20 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
              }`
            }
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {!isCollapsed && <span className="truncate">Profile</span>}
          </NavLink>
        </nav>
      </div>

      {/* Footer User Info & Sign Out */}
      <div className={`pt-3 border-t border-border space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {isCollapsed ? (
          <>
            <div
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-ink border border-border cursor-pointer"
              title={`${user?.fullName || 'User'} (${user?.email})`}
            >
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-2.5 px-1 py-0.5">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-ink border border-border shrink-0">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-ink truncate leading-tight">{user?.fullName || 'Seller'}</p>
                <p className="text-[10px] text-gray-500 truncate leading-tight">{user?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
