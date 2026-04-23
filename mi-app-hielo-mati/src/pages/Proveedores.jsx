import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/helpers'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ nombre: '', precio_bolsa_chica: '', precio_bolsa_grande: '' })
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores(data || [])
    setLoading(false)
  }

  const openNew = () => {
    setEditing(null)
    setForm({ nombre: '', precio_bolsa_chica: '', precio_bolsa_grande: '' })
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({ nombre: p.nombre, precio_bolsa_chica: p.precio_bolsa_chica, precio_bolsa_grande: p.precio_bolsa_grande })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.nombre || !form.precio_bolsa_chica || !form.precio_bolsa_grande) return
    if (editing) {
      await supabase.from('proveedores').update(form).eq('id', editing.id)
    } else {
      await supabase.from('proveedores').insert(form)
    }
    setShowForm(false)
    load()
  }

  const remove = async (id) => {
    await supabase.from('proveedores').delete().eq('id', id)
    setConfirm(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-700 text-white">Proveedores</h1>
        <button onClick={openNew} className="btn-primary">+ Nuevo</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando...</div>
      ) : proveedores.length === 0 ? (
        <div className="card text-center py-8 text-slate-500">No hay proveedores. Agregá uno.</div>
      ) : (
        <div className="space-y-3">
          {proveedores.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <button onClick={() => navigate(`/proveedores/${p.id}`)} className="text-left flex-1">
                  <p className="font-display font-600 text-white text-lg">{p.nombre}</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Chica: {formatARS(p.precio_bolsa_chica)} · Grande: {formatARS(p.precio_bolsa_grande)}
                  </p>
                </button>
                <div className="flex gap-2 ml-3">
                  <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-ice-400 transition-colors text-sm">✏️</button>
                  <button onClick={() => setConfirm(p.id)} className="text-slate-400 hover:text-red-400 transition-colors text-sm">🗑️</button>
                </div>
              </div>
              <button
                onClick={() => navigate(`/proveedores/${p.id}`)}
                className="mt-3 text-ice-400 text-xs font-body hover:text-ice-300 transition-colors"
              >
                Ver retiros y pagos →
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del proveedor" />
            </div>
            <div>
              <label className="label">Precio bolsa chica ($)</label>
              <input className="input" type="number" value={form.precio_bolsa_chica} onChange={e => setForm({ ...form, precio_bolsa_chica: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="label">Precio bolsa grande ($)</label>
              <input className="input" type="number" value={form.precio_bolsa_grande} onChange={e => setForm({ ...form, precio_bolsa_grande: e.target.value })} placeholder="0" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={save} className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {confirm && (
        <Confirm
          message="¿Eliminar este proveedor? Se perderán todos sus retiros y pagos."
          onConfirm={() => remove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
