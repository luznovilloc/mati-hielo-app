import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/helpers'
import Modal from '../components/Modal'
import Confirm from '../components/Confirm'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [deudas, setDeudas] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', precio_bolsa_chica: '', precio_bolsa_grande: '' })
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [clientesRes, entregasRes, cobrosRes] = await Promise.all([
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('entregas').select('*, clientes(precio_bolsa_chica, precio_bolsa_grande)').eq('pagado', false),
      supabase.from('cobros_clientes').select('cliente_id, monto'),
    ])

    // Calcular deuda por cliente
    const deudasMap = {}
    for (const e of entregasRes.data || []) {
      const pc = e.clientes?.precio_bolsa_chica || 0
      const pg = e.clientes?.precio_bolsa_grande || 0
      const monto = (e.bolsas_chicas * pc) + (e.bolsas_grandes * pg)
      deudasMap[e.cliente_id] = (deudasMap[e.cliente_id] || 0) + monto
    }
    // Restar cobros
    for (const c of cobrosRes.data || []) {
      deudasMap[c.cliente_id] = (deudasMap[c.cliente_id] || 0) - Number(c.monto)
    }

    setClientes(clientesRes.data || [])
    setDeudas(deudasMap)
    setLoading(false)
  }

  const openNew = () => {
    setEditing(null)
    setForm({ nombre: '', telefono: '', direccion: '', precio_bolsa_chica: '', precio_bolsa_grande: '' })
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ nombre: c.nombre, telefono: c.telefono || '', direccion: c.direccion || '', precio_bolsa_chica: c.precio_bolsa_chica, precio_bolsa_grande: c.precio_bolsa_grande })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.nombre || !form.precio_bolsa_chica || !form.precio_bolsa_grande) return
    if (editing) {
      await supabase.from('clientes').update(form).eq('id', editing.id)
    } else {
      await supabase.from('clientes').insert(form)
    }
    setShowForm(false)
    load()
  }

  const remove = async (id) => {
    await supabase.from('clientes').delete().eq('id', id)
    setConfirm(null)
    load()
  }

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.telefono || '').includes(search)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-700 text-white">Clientes</h1>
        <button onClick={openNew} className="btn-primary">+ Nuevo</button>
      </div>

      <input
        className="input"
        placeholder="Buscar por nombre o teléfono..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-8 text-slate-500">{search ? 'Sin resultados' : 'No hay clientes. Agregá uno.'}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const deuda = deudas[c.id] || 0
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between">
                  <button onClick={() => navigate(`/clientes/${c.id}`)} className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-600 text-white text-lg">{c.nombre}</p>
                      {deuda > 0 && <span className="badge-red">{formatARS(deuda)}</span>}
                      {deuda <= 0 && <span className="badge-green">Al día</span>}
                    </div>
                    {c.telefono && <p className="text-slate-400 text-sm mt-0.5">📞 {c.telefono}</p>}
                    {c.direccion && <p className="text-slate-400 text-sm">📍 {c.direccion}</p>}
                    <p className="text-slate-500 text-xs mt-1">
                      Chica: {formatARS(c.precio_bolsa_chica)} · Grande: {formatARS(c.precio_bolsa_grande)}
                    </p>
                  </button>
                  <div className="flex gap-2 ml-3">
                    <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-ice-400 transition-colors">✏️</button>
                    <button onClick={() => setConfirm(c.id)} className="text-slate-400 hover:text-red-400 transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="Ej: 11 1234-5678" />
            </div>
            <div>
              <label className="label">Dirección</label>
              <input className="input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Ej: Av. Corrientes 1234" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Precio bolsa chica ($) *</label>
                <input className="input" type="number" value={form.precio_bolsa_chica} onChange={e => setForm({ ...form, precio_bolsa_chica: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="label">Precio bolsa grande ($) *</label>
                <input className="input" type="number" value={form.precio_bolsa_grande} onChange={e => setForm({ ...form, precio_bolsa_grande: e.target.value })} placeholder="0" />
              </div>
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
          message="¿Eliminar este cliente? Se perderán todas sus entregas y cobros."
          onConfirm={() => remove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
