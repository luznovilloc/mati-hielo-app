import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', icon: '📊', label: 'Inicio', exact: true },
  { to: '/proveedores', icon: '🏭', label: 'Proveedor' },
  { to: '/clientes', icon: '👥', label: 'Clientes' },
  { to: '/empleado', icon: '👷', label: 'Empleado' },
]

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧊</span>
          <span className="font-display font-700 text-white text-lg">Hielo App</span>
        </div>
        <button onClick={handleSignOut} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          Salir
        </button>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800">
        <div className="max-w-2xl mx-auto flex">
          {navItems.map(({ to, icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                  isActive ? 'text-ice-400' : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              <span className="text-xl">{icon}</span>
              <span className="text-xs font-body">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
