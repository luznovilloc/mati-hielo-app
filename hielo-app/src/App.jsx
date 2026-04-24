import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Proveedores from './pages/Proveedores'
import ProveedorDetalle from './pages/ProveedorDetalle'
import Clientes from './pages/Clientes'
import ClienteDetalle from './pages/ClienteDetalle'
import Empleado from './pages/Empleado'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-ice-400 font-display text-lg animate-pulse">Cargando...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="proveedores" element={<Proveedores />} />
            <Route path="proveedores/:id" element={<ProveedorDetalle />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/:id" element={<ClienteDetalle />} />
            <Route path="empleado" element={<Empleado />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
