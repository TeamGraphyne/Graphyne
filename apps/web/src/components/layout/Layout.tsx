import { Outlet, NavLink } from 'react-router-dom';

export function Layout() {
  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 text-white overflow-hidden">
      {/* 1. TOP HEADER & NAVIGATION */}
      <header className="flex items-center justify-between h-14 px-4 bg-gray-900 border-b border-gray-800 shrink-0">
        
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center font-bold text-lg">
            G
          </div>
          <span className="font-bold text-lg tracking-tight">Graphyne</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <NavItem to="/editor" label="Creator" icon="🎨" />
          <NavItem to="/data" label="Data Source" icon="💽" />
          <NavItem to="/preview" label="Preview" icon="👁️" />
          <NavItem to="/playback" label="Playout" icon="📺" />
        </nav>

        {/* Placeholder for User/Settings (Right side) */}
        <div className="w-8 h-8 bg-gray-800 rounded-full" />
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-hidden">
        {/* The <Outlet /> renders the current route (e.g., EditorPage) */}
        <Outlet />
      </main>
    </div>
  );
}

// Helper Component for consistent Nav Links
function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium ${
          isActive
            ? 'bg-purple-600/20 text-purple-400 border border-purple-600/50' // Active Style
            : 'text-gray-400 hover:text-white hover:bg-gray-800'             // Inactive Style
        }`
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}